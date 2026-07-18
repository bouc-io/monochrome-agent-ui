import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Loader2, MoreHorizontal, Trash2, Settings, User, LogOut, ChevronDown, SendHorizontal, Square, Pencil, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getAvailableModels } from "@/lib/models";
import { useAgentApi, Assignment } from "@/lib/agentApi";
import { useAuth } from "@/auth/authcontext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { SettingsOverlay } from "@/components/SettingsOverlay";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { NavigationDropdown } from "@/components/NavigationDropdown";
import { cn } from "@/lib/utils";
import logger from '@/lib/logger';

const log = logger.child('Index');

const SUGGESTED_PROMPTS = [
  "Summarize this document for me",
  "Research the latest trends in AI",
  "Write a report about market analysis",
  "Help me plan a project timeline",
  "Draft an email to a client",
  "Analyze this data set",
];

const Index = () => {
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const availableModels = getAvailableModels();
  
  const getInitialModel = () => {
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel && availableModels.find(m => m.id === savedModel)) {
      return savedModel;
    }
    return availableModels[0]?.id || "llama3.2";
  };
  
  const [selectedModel, setSelectedModel] = useState(getInitialModel());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [newAssignmentPrompt, setNewAssignmentPrompt] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"settings" | "account">("settings");

  // Delete confirmation
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Rename
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Sidebar search
  const [sidebarSearch, setSidebarSearch] = useState("");

  // Infinite scroll
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  
  const { getAllAssignments, deleteAssignment, createAssignment, updateAssignment } = useAgentApi();

  const PAGE_SIZE = 20;

  const loadAssignments = useCallback(async () => {
    try {
      const { assignments: fetchedAssignments, pagination } = await getAllAssignments({ 
        sort: 'updated_at', 
        order: 'desc',
        limit: PAGE_SIZE,
        page: 1,
      });
      setAssignments(fetchedAssignments);
      setCurrentPage(1);
      setHasMore(pagination.page < pagination.total_pages);
    } catch (error) {
      log.error('Failed to load assignments:', error);
      toast({ title: t.errorLoadAssignments, variant: "destructive" });
      setAssignments([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [getAllAssignments]);

  const loadMoreAssignments = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const { assignments: fetchedAssignments, pagination } = await getAllAssignments({
        sort: 'updated_at',
        order: 'desc',
        limit: PAGE_SIZE,
        page: nextPage,
      });
      setAssignments(prev => [...prev, ...fetchedAssignments]);
      setCurrentPage(nextPage);
      setHasMore(pagination.page < pagination.total_pages);
    } catch (error) {
      log.error('Failed to load more assignments:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [getAllAssignments, currentPage, hasMore, isLoadingMore]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  // Infinite scroll: listen for scroll events on the viewport
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      if (scrollHeight - scrollTop - clientHeight < 100) {
        loadMoreAssignments();
      }
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [loadMoreAssignments]);

  useEffect(() => {
    localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  const handleDeleteAssignment = async (id: string) => {
    try {
      await deleteAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      log.error('Failed to delete assignment:', error);
      toast({ title: t.errorDeleteAssignment, variant: "destructive" });
    }
  };

  const handleRenameAssignment = async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      await updateAssignment(id, { title: editTitle.trim() });
      setAssignments(prev => prev.map(a => a.id === id ? { ...a, title: editTitle.trim() } : a));
      setEditingAssignmentId(null);
      setEditTitle("");
    } catch (error) {
      log.error('Failed to rename assignment:', error);
      toast({ title: "Failed to rename assignment", variant: "destructive" });
    }
  };

  const handleStartNewAssignment = async () => {
    if (!newAssignmentPrompt.trim()) return;
    
    setIsCreating(true);
    try {
      const newAssignment = await createAssignment({
        title: newAssignmentPrompt.slice(0, 50) + (newAssignmentPrompt.length > 50 ? "..." : ""),
        metadata: {
          context: newAssignmentPrompt
        }
      });
      
      navigate(`/assignments/${newAssignment.id}`, { 
        state: { initialMessage: newAssignmentPrompt, selectedModel } 
      });
    } catch (error) {
      log.error('Failed to create assignment:', error);
      toast({ title: t.errorCreateAssignment, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectAssignment = (id: string) => {
    navigate(`/assignments/${id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStartNewAssignment();
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const currentModelData = availableModels.find(m => m.id === selectedModel) || availableModels[0];
  
  const userEmail = (user?.email || user?.preferred_username || "Unknown User") as string;
  const userName = (user?.name || user?.preferred_username || userEmail) as string;
  const userInitials = userName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const filteredAssignments = assignments.filter(a =>
    !sidebarSearch.trim() || a.title.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  return (
    <div className="h-dvh flex bg-background overflow-hidden">
      {/* Left Sidebar - Assignments List */}
      <div className="w-80 border-r border-border flex flex-col bg-sidebar-background h-full">
        {/* Model Selector Header */}
        <div className="p-4 border-b border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <div className="text-left flex-1 min-w-0 mr-2">
                  <p className="font-medium text-sm truncate">{currentModelData?.name || "Unknown Model"}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">
                    {currentModelData?.description || "AI Model"}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {availableModels.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={cn("flex flex-col items-start p-3", selectedModel === model.id && "bg-accent")}
                >
                  <div className="font-medium">{model.name}</div>
                  <div className="text-xs text-muted-foreground">{model.description}</div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sidebar Search */}
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder={t.searchAssignments}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Assignments List */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full px-2 py-2" viewportRef={scrollViewportRef}>
            {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  {sidebarSearch.trim() ? "No matching assignments." : "No work assignments yet."}
                  <br />
                  {!sidebarSearch.trim() && "Start a new one below."}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  onClick={() => handleSelectAssignment(assignment.id)}
                  className="group relative p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {editingAssignmentId === assignment.id ? (
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') handleRenameAssignment(assignment.id);
                            if (e.key === 'Escape') { setEditingAssignmentId(null); setEditTitle(""); }
                          }}
                          onBlur={() => handleRenameAssignment(assignment.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-6 text-sm p-1"
                          autoFocus
                        />
                      ) : (
                        <>
                          <p className="font-medium text-sm truncate">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{assignment.metadata?.context || "Work assignment"}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatTime(assignment.updated_at)}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAssignmentId(assignment.id);
                            setEditTitle(assignment.title);
                          }}
                        >
                          <Pencil className="w-3 h-3 mr-2" />
                          {t.renameAssignment}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDeleteId(assignment.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          {t.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                ))}
                {/* Sentinel for infinite scroll */}
                {hasMore && !sidebarSearch.trim() && (
                  <div className="flex items-center justify-center py-3">
                    {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* User Account Footer */}
        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                <Avatar className="w-8 h-8 mr-3">
                  <AvatarFallback className="bg-accent text-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left flex-1">
                  <p className="font-medium text-sm truncate">{userEmail}</p>
                  <p className="text-xs text-muted-foreground">{t.freePlan}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => { setSettingsTab("settings"); setSettingsOpen(true); }}>
                <Settings className="w-4 h-4 mr-2" />
                {t.settings}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSettingsTab("account"); setSettingsOpen(true); }}>
                <User className="w-4 h-4 mr-2" />
                {t.account}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logoutUser} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                {t.logOut}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content - New Assignment Input */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h1 className="text-lg font-semibold text-foreground">Agent</h1>
          <div className="flex items-center gap-2">
            <ConnectionStatus />
            <NavigationDropdown />
          </div>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold mb-2">What would you like to work on?</h2>
              <p className="text-muted-foreground">
                Describe your task and the agent will help you accomplish it.
              </p>
            </div>
            
            <div className="relative">
              <Input
                value={newAssignmentPrompt}
                onChange={(e) => setNewAssignmentPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your work assignment..."
                className="pr-12 h-14 text-base"
                disabled={isCreating}
              />
              <Button
                onClick={handleStartNewAssignment}
                disabled={!newAssignmentPrompt.trim() && !isCreating}
                size="icon"
                className={`absolute right-2 top-1/2 -translate-y-1/2 ${
                  isCreating 
                    ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                }`}
              >
                {isCreating ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <SendHorizontal className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Suggested Prompts */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setNewAssignmentPrompt(prompt)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted/50 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SettingsOverlay 
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab={settingsTab}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.deleteConfirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteId) handleDeleteAssignment(pendingDeleteId);
                setPendingDeleteId(null);
              }}
            >
              {t.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
