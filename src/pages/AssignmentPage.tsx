import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Lightbulb, Loader2, Search, X, ChevronUp, ChevronDown, Activity, CheckCircle, XCircle, Clock, Circle, Ban, Maximize2, Minimize2, ShieldAlert } from "lucide-react";
import { ApprovalCard } from "@/components/ApprovalCard";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { AutoScrollToggle } from "@/components/AutoScrollToggle";
import { NavigationDropdown } from "@/components/NavigationDropdown";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAgentApi, AgentMessage, RunStatus, RunPlan, TokenUsage } from "@/lib/agentApi";
import { useRunStream, ActivityEntry, ToolCallEntry, PendingApproval } from "@/hooks/useRunStream";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import logger from '@/lib/logger';

const log = logger.child('AssignmentPage');

interface DisplayMessage {
  id?: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  runId?: string;
  initialFeedback?: 'positive' | 'negative';
}

interface ReasoningEntry {
  content: string;
  timestamp: Date;
}

const RunStatusBadge = ({ status }: { status: RunStatus | null }) => {
  if (!status) return null;

  const config: Record<RunStatus, { icon: React.ReactNode; label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    queued: { icon: <Clock className="w-3 h-3" />, label: "Queued", variant: "secondary" },
    running: { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: "Running", variant: "default" },
    pending_approval: { icon: <ShieldAlert className="w-3 h-3" />, label: "Awaiting Approval", variant: "outline" },
    completed: { icon: <CheckCircle className="w-3 h-3" />, label: "Completed", variant: "secondary" },
    failed: { icon: <XCircle className="w-3 h-3" />, label: "Failed", variant: "destructive" },
    cancelled: { icon: <Ban className="w-3 h-3" />, label: "Cancelled", variant: "outline" },
  };

  const c = config[status];
  return (
    <Badge variant={c.variant} className="flex items-center gap-1 text-xs">
      {c.icon}
      {c.label}
    </Badge>
  );
};

const TokenUsageBadge = ({ usage }: { usage: TokenUsage | null }) => {
  if (!usage || usage.total_tokens === 0) return null;
  return (
    <span className="text-[10px] text-muted-foreground">
      {usage.total_tokens.toLocaleString()} tokens · {usage.llm_calls} call{usage.llm_calls !== 1 ? 's' : ''}
    </span>
  );
};

const AssignmentPage = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssignmentLoading, setIsAssignmentLoading] = useState(true);
  const [assignmentTitle, setAssignmentTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [reasoningEntries, setReasoningEntries] = useState<ReasoningEntry[]>([]);
  const [workspaceTab, setWorkspaceTab] = useState("reasoning");
  const [workspaceAutoScroll, setWorkspaceAutoScroll] = useState(true);
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);
  const workspaceScrollRef = useRef<HTMLDivElement>(null);

  // Run state
  const [activeStreamUrl, setActiveStreamUrl] = useState<string | null>(null);
  const [activeRunAssignmentId, setActiveRunAssignmentId] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchingIndices, setMatchingIndices] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [highlightedMessageIndex, setHighlightedMessageIndex] = useState<number | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { getAssignmentById, getMessagesByAssignment, createMessage, deleteMessage, cancelRun, approveRun, getRunStreamUrl, getRunStreamHeaders, listRuns, getRunDetail } = useAgentApi();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Run stream hook
  const handleCancelRun = useCallback(async () => {
    if (activeRunAssignmentId && activeRunId) {
      await cancelRun(activeRunAssignmentId, activeRunId);
    }
  }, [activeRunAssignmentId, activeRunId, cancelRun]);

  const handleMessageCreated = useCallback((messageId: string, content?: string) => {
    if (content) {
      // Strip <think> tags from display — reasoning is handled by step.reasoning events
      const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      setMessages(prev => [...prev, {
        id: messageId,
        text: cleanContent || content,
        isBot: true,
        timestamp: new Date(),
        runId: activeRunIdRef.current ?? undefined,
      }]);
    }
  }, []);

  const handleStepReasoning = useCallback((stepIndex: number, content: string) => {
    // Extract content from <think> tags if present, otherwise use raw content
    const thinkTagRegex = /<think>([\s\S]*?)<\/think>/g;
    let reasoningContent = '';
    let match;
    while ((match = thinkTagRegex.exec(content)) !== null) {
      reasoningContent += match[1].trim() + '\n';
    }
    // If no <think> tags found, use the full content as reasoning
    if (!reasoningContent) {
      reasoningContent = content;
    }

    setReasoningEntries(prev => [...prev, {
      content: reasoningContent.trim(),
      timestamp: new Date(),
    }]);
  }, []);

  const handleRunCompleted = useCallback(() => {
    setIsLoading(false);
    setActiveStreamUrl(null);
    setActiveRunId(null);
    setActiveRunAssignmentId(null);
  }, []);

  const handleRunFailed = useCallback((errorMsg: string) => {
    setIsLoading(false);
    setActiveStreamUrl(null);
    setActiveRunId(null);
    setActiveRunAssignmentId(null);
    toast({ title: "Run failed", description: errorMsg, variant: "destructive" });
    setMessages(prev => [...prev, {
      text: `Sorry, an error occurred: ${errorMsg}`,
      isBot: true,
      timestamp: new Date(),
    }]);
  }, []);

  const streamHeaders = useMemo(() => {
    try { return getRunStreamHeaders(); } catch { return undefined; }
  }, [getRunStreamHeaders]);

  const runStream = useRunStream({
    streamUrl: activeStreamUrl,
    streamHeaders,
    onCancel: handleCancelRun,
    onMessageCreated: handleMessageCreated,
    onStepReasoning: handleStepReasoning,
    onRunCompleted: handleRunCompleted,
    onRunFailed: handleRunFailed,
  });

  // Stable ref to track activeRunId inside callbacks with [] deps
  const activeRunIdRef = useRef<string | null>(null);
  activeRunIdRef.current = activeRunId;

  // Stable refs to hydrate/resetAll — avoids loadAssignment depending on runStream object
  const hydrateRef = useRef(runStream.hydrate);
  hydrateRef.current = runStream.hydrate;
  const resetAllRef = useRef(runStream.resetAll);
  resetAllRef.current = runStream.resetAll;

  // Accumulate reasoning from streaming thinking tokens
  useEffect(() => {
    if (runStream.thinkingTokens) {
      // Update streaming thinking display — we don't add to reasoningEntries until run completes
    }
  }, [runStream.thinkingTokens]);

  const scrollToBottom = () => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, runStream.tokens, autoScrollEnabled]);

  // Workspace auto-scroll
  const scrollWorkspaceToBottom = useCallback(() => {
    if (workspaceAutoScroll && workspaceScrollRef.current) {
      workspaceScrollRef.current.scrollTo({
        top: workspaceScrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [workspaceAutoScroll]);

  useEffect(() => {
    scrollWorkspaceToBottom();
  }, [reasoningEntries, runStream.thinkingTokens, runStream.activityLog, workspaceAutoScroll, scrollWorkspaceToBottom]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setMatchingIndices([]);
      setCurrentMatchIndex(0);
      setHighlightedMessageIndex(null);
      return;
    }

    const query = searchQuery.toLowerCase();
    const indices = messages
      .map((msg, index) => ({ msg, index }))
      .filter(({ msg }) => msg.text.toLowerCase().includes(query))
      .map(({ index }) => index);

    setMatchingIndices(indices);
    setCurrentMatchIndex(0);

    if (indices.length > 0) {
      setHighlightedMessageIndex(indices[0]);
    } else {
      setHighlightedMessageIndex(null);
    }
  }, [searchQuery, messages]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearchPrevious = () => {
    if (matchingIndices.length === 0) return;
    const newIndex = currentMatchIndex === 0 ? matchingIndices.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(newIndex);
    setHighlightedMessageIndex(matchingIndices[newIndex]);
  };

  const handleSearchNext = () => {
    if (matchingIndices.length === 0) return;
    const newIndex = currentMatchIndex === matchingIndices.length - 1 ? 0 : currentMatchIndex + 1;
    setCurrentMatchIndex(newIndex);
    setHighlightedMessageIndex(matchingIndices[newIndex]);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setMatchingIndices([]);
    setCurrentMatchIndex(0);
    setHighlightedMessageIndex(null);
  };

  const loadAssignment = useCallback(async (id: string) => {
    if (!id) return;

    setIsAssignmentLoading(true);
    setError(null);

    try {
      const assignment = await getAssignmentById(id);
      setAssignmentTitle(assignment.title || "Untitled Assignment");

      const { messages: assignmentMessages } = await getMessagesByAssignment(id);

      const sortedMessages = assignmentMessages.sort((a, b) =>
        a.created_at.getTime() - b.created_at.getTime()
      );

      const displayMessages: DisplayMessage[] = sortedMessages.map(msg => ({
        id: msg.id,
        text: msg.role === 'assistant'
          ? (msg.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim() || msg.content)
          : msg.content,
        isBot: msg.role === 'assistant',
        timestamp: msg.created_at,
        runId: msg.run_id,
      }));

      // Extract reasoning entries from existing messages (global regex to capture ALL think blocks)
      const thinkTagRegex = /<think>([\s\S]*?)<\/think>/g;
      const extractedReasoning: ReasoningEntry[] = [];
      for (const msg of sortedMessages) {
        if (msg.role !== 'assistant') continue;
        let match;
        while ((match = thinkTagRegex.exec(msg.content)) !== null) {
          const content = match[1].trim();
          if (content) {
            extractedReasoning.push({ content, timestamp: msg.created_at });
          }
        }
        thinkTagRegex.lastIndex = 0; // Reset regex state for next message
      }

      setMessages(displayMessages);

      // Hydrate workspace from ALL completed runs (not just the latest)
      try {
        const { data: runs } = await listRuns(id, 1, 50);
        const finishedRuns = runs.filter(r => ['completed', 'failed', 'cancelled'].includes(r.status));

        const allStepReasoning: ReasoningEntry[] = [];
        // Map run_id → feedback rating for hydrating ChatMessage initial state
        const feedbackByRunId = new Map<string, 'positive' | 'negative'>();

        // Reset stream state, then hydrate ALL finished runs (accumulates activity)
        resetAllRef.current();

        for (const run of finishedRuns) {
          try {
            const detail = await getRunDetail(id, run.id);

            // Capture feedback rating if one exists for this run
            if (detail.feedback?.rating === 'positive' || detail.feedback?.rating === 'negative') {
              feedbackByRunId.set(run.id, detail.feedback.rating);
            }

            // Collect reasoning from run steps
            for (const s of detail.steps) {
              if (!s.output) continue;
              const output = s.output as Record<string, unknown>;

              if (s.type === 'plan' && output.raw_reasoning) {
                allStepReasoning.push({
                  content: output.raw_reasoning as string,
                  timestamp: new Date(s.created_at),
                });
              } else if (s.type === 'execution' && (output.content || output.summary)) {
                allStepReasoning.push({
                  content: (output.content as string) || (output.summary as string),
                  timestamp: new Date(s.created_at),
                });
              }
            }

            // Hydrate activity/tool calls for this run
            hydrateRef.current(detail);
          } catch {
            log.warn(`Failed to load run detail for run ${run.id}`);
          }
        }

        // Apply persisted feedback to the relevant bot messages
        if (feedbackByRunId.size > 0) {
          setMessages(prev => prev.map(msg =>
            msg.runId && feedbackByRunId.has(msg.runId)
              ? { ...msg, initialFeedback: feedbackByRunId.get(msg.runId) }
              : msg
          ));
        }

        // Merge reasoning: combine <think> tag extractions + run step reasoning, deduplicate
        const mergedReasoning = [...extractedReasoning];
        for (const sr of allStepReasoning) {
          // Skip if a similar entry already exists (same content within 5s timestamp)
          const isDuplicate = mergedReasoning.some(
            existing =>
              existing.content === sr.content &&
              Math.abs(existing.timestamp.getTime() - sr.timestamp.getTime()) < 5000
          );
          if (!isDuplicate) {
            mergedReasoning.push(sr);
          }
        }
        mergedReasoning.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        setReasoningEntries(mergedReasoning);
      } catch (runError) {
        // Non-critical — fall back to think-tag reasoning only
        log.warn('Failed to load run history for workspace:', runError);
        setReasoningEntries(extractedReasoning);
      }

    } catch (error) {
      log.error('Failed to load assignment:', error);
      toast({ title: "Failed to load assignment", variant: "destructive" });
      setError('Failed to load assignment. Please try again.');
      setAssignmentTitle("Error Loading Assignment");
      setMessages([]);
    } finally {
      setIsAssignmentLoading(false);
    }
  }, [getAssignmentById, getMessagesByAssignment, listRuns, getRunDetail]);

  useEffect(() => {
    if (assignmentId) {
      loadAssignment(assignmentId);
    }
  }, [assignmentId, loadAssignment]);

  // Handle initial message from navigation state
  useEffect(() => {
    const state = location.state as { initialMessage?: string } | null;
    if (state?.initialMessage && assignmentId) {
      handleSendMessage(state.initialMessage);
      navigate(location.pathname, { replace: true });
    }
  }, [assignmentId]);

  const handleRetryMessage = async (index: number) => {
    if (!assignmentId) return;

    const userMessage = messages[index];
    if (!userMessage || userMessage.isBot) return;

    // Remove the bot response that follows (if any)
    const botMessage = messages[index + 1];
    if (botMessage?.isBot && botMessage.id) {
      try {
        await deleteMessage(assignmentId, botMessage.id);
      } catch (err) {
        log.warn('Failed to delete old bot message from backend:', err);
      }
    }

    // Remove the bot message (and any subsequent messages) from state, keep user message
    setMessages(prev => prev.slice(0, botMessage?.isBot ? index + 1 : index + 1));
    setIsLoading(true);

    try {
      const response = await createMessage(assignmentId, {
        content: userMessage.text,
        role: 'user',
        options: { stream: true, client_type: 'web' },
        idempotency_key: crypto.randomUUID(),
      });

      const { run } = response;
      if (run?.stream_url) {
        setActiveRunId(run.id);
        setActiveRunAssignmentId(assignmentId);
        const fullStreamUrl = getRunStreamUrl(assignmentId, run.id);
        setActiveStreamUrl(fullStreamUrl);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      log.error('Error in handleRetryMessage:', err);
      toast({ title: "Failed to retry message", variant: "destructive" });
      setMessages(prev => [...prev, {
        text: "Sorry, I encountered an error while processing your request.",
        isBot: true,
        timestamp: new Date()
      }]);
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!assignmentId) return;

    setMessages(prev => [...prev, {
      text: message,
      isBot: false,
      timestamp: new Date()
    }]);
    setIsLoading(true);

    try {
      const response = await createMessage(assignmentId, {
        content: message,
        role: 'user',
        options: { stream: true, client_type: 'web' },
        idempotency_key: crypto.randomUUID(),
      });

      // Store user message ID
      if (response.user_message?.id) {
        setMessages(prev => prev.map((msg, i) =>
          i === prev.length - 1 && !msg.isBot ? { ...msg, id: response.user_message.id } : msg
        ));
      }

      // V2: response contains run info with stream_url
      const { run } = response;
      if (run?.stream_url) {
        setActiveRunId(run.id);
        setActiveRunAssignmentId(assignmentId);
        // Build full stream URL with auth
        const fullStreamUrl = getRunStreamUrl(assignmentId, run.id);
        setActiveStreamUrl(fullStreamUrl);
      } else {
        // Fallback: no run returned (shouldn't happen in V2)
        setIsLoading(false);
      }
    } catch (err) {
      log.error('Error in handleSendMessage:', err);
      toast({ title: "Failed to send message", variant: "destructive" });
      setMessages(prev => [...prev, {
        text: "Sorry, I encountered an error while processing your request.",
        isBot: true,
        timestamp: new Date()
      }]);
      setIsLoading(false);
    }
  };

  const handleStopGeneration = () => {
    runStream.cancel();
    if (runStream.tokens) {
      setMessages(prev => [...prev, {
        text: runStream.tokens + "\n\n*[Generation stopped]*",
        isBot: true,
        timestamp: new Date()
      }]);
    }
    setIsLoading(false);
    setActiveStreamUrl(null);
    setActiveRunId(null);
    setActiveRunAssignmentId(null);
  };

  const handleBack = () => {
    navigate('/');
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex bg-background overflow-hidden">
      {/* Left Panel - Chat (40%) */}
      <div className="w-[40%] h-full border-r border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground truncate">{assignmentTitle || "Loading..."}</h1>
            <p className="text-xs text-muted-foreground">Agent workspace</p>
          </div>

          {/* Search */}
          {isSearchOpen ? (
            <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") handleCloseSearch();
                  else if (e.key === "Enter") {
                    if (e.shiftKey) handleSearchPrevious();
                    else handleSearchNext();
                  }
                }}
                className="h-6 w-24 border-0 focus-visible:ring-0 px-1 text-sm"
              />
              {matchingIndices.length > 0 && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {currentMatchIndex + 1}/{matchingIndices.length}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={handleSearchPrevious} disabled={matchingIndices.length === 0} className="h-5 w-5 p-0">
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSearchNext} disabled={matchingIndices.length === 0} className="h-5 w-5 p-0">
                <ChevronDown className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCloseSearch} className="h-5 w-5 p-0">
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setIsSearchOpen(true)} className="h-8 w-8 p-0" title="Search messages">
              <Search className="h-4 w-4" />
            </Button>
          )}

          <AutoScrollToggle enabled={autoScrollEnabled} onToggle={() => setAutoScrollEnabled(!autoScrollEnabled)} />
          <ConnectionStatus />
          <NavigationDropdown />
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {isAssignmentLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  Start the conversation...
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={highlightedMessageIndex === index ? "ring-2 ring-primary rounded-lg" : ""}
                    >
                      <ChatMessage
                        message={message.text}
                        isBot={message.isBot}
                        onResubmit={!message.isBot ? () => handleRetryMessage(index) : undefined}
                        timestamp={message.timestamp}
                        runId={message.runId}
                        assignmentId={assignmentId}
                        initialFeedback={message.initialFeedback}
                      />
                    </div>
                  ))}
                  {isLoading && runStream.tokens && (
                    <ChatMessage
                      message={runStream.tokens}
                      isBot={true}
                    />
                  )}
                  {isLoading && !runStream.tokens && runStream.status !== 'pending_approval' && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] bg-muted rounded-2xl px-4 py-3">
                        <TypingIndicator />
                      </div>
                    </div>
                  )}
                  {/* Approval card — inline in chat stream */}
                  {runStream.pendingApproval && !runStream.pendingApproval.resolved && activeRunId && (
                    <ApprovalCard
                      request={runStream.pendingApproval}
                      assignmentId={assignmentId!}
                      runId={activeRunId}
                      onApprove={async (approvalRequestId, approved, reason) => {
                        await approveRun(assignmentId!, activeRunId, {
                          approval_request_id: approvalRequestId,
                          approved,
                          reason,
                        });
                      }}
                      onResolved={(approved, reason) => {
                        runStream.resolvePendingApproval(approved, reason);
                      }}
                    />
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isLoading || isAssignmentLoading || runStream.status === 'pending_approval'}
            isStreaming={isLoading && runStream.status !== 'pending_approval'}
            onStop={handleStopGeneration}
          />
        </div>
      </div>

      {/* Right Panel - Workspace (60%) */}
      <div className="w-[60%] h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-foreground">Workspace</h2>
            <RunStatusBadge status={runStream.status} />
            <TokenUsageBadge usage={runStream.runTokenUsage} />
          </div>
          <AutoScrollToggle
            enabled={workspaceAutoScroll}
            onToggle={() => setWorkspaceAutoScroll(!workspaceAutoScroll)}
          />
        </div>

        {/* Workspace Content */}
        <div className="flex-1 overflow-hidden relative">
          <Tabs value={workspaceTab} onValueChange={setWorkspaceTab} className="h-full flex flex-col">
            <div className="px-4 pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="reasoning" className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Reasoning & Plan
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Activity
                  {runStream.activityLog.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                      {runStream.activityLog.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden relative">
              {/* Floating Plan Button (collapsed) */}
              {runStream.plan && !isPlanExpanded && (
                <button
                  onClick={() => setIsPlanExpanded(true)}
                  className="absolute top-3 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card hover:bg-accent transition-colors text-sm text-foreground font-medium shadow-md"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Plan
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {runStream.plan.steps.length}
                  </Badge>
                </button>
              )}

              {/* Plan Overlay (expanded) */}
               {runStream.plan && isPlanExpanded && (
                <>
                  <div
                    className="absolute inset-0 z-20 bg-black/30 animate-fade-in"
                    onClick={() => setIsPlanExpanded(false)}
                  />
                  <div className="absolute inset-x-4 top-3 bottom-1/2 z-30 rounded-lg border border-border bg-card shadow-lg flex flex-col animate-scale-in-top origin-top">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-primary">📋 Plan</h4>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">{runStream.plan.goal}</p>
                      </div>
                      <button
                        onClick={() => setIsPlanExpanded(false)}
                        className="ml-3 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Minimize2 className="w-4 h-4" />
                      </button>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                      <ol className="space-y-2">
                        {runStream.plan.steps.map((step, idx) => {
                          const isCompleted = idx < runStream.currentStepIndex;
                          const isCurrent = idx === runStream.currentStepIndex && runStream.status === 'running';
                          return (
                            <li key={step.id} className={`flex items-start gap-2 text-sm transition-colors ${isCurrent ? 'bg-primary/5 rounded-md p-1 -m-1' : ''}`}>
                              <span className={`flex-shrink-0 w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium ${
                                isCompleted ? 'bg-emerald-500/20 text-emerald-600' : isCurrent ? 'bg-primary/20 text-primary animate-pulse' : 'bg-primary/10 text-primary'
                              }`}>
                                {isCompleted ? '✓' : step.id}
                              </span>
                              <span className={isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}>{step.description}</span>
                            </li>
                          );
                        })}
                      </ol>
                    </ScrollArea>
                  </div>
                </>
              )}

              {/* Reasoning & Plan Tab */}
              <TabsContent value="reasoning" className="h-full m-0 p-4">
                <ScrollArea className="h-full" viewportRef={workspaceScrollRef}>
                  <div className="space-y-4">
                    {/* Reasoning entries */}
                    {reasoningEntries.length === 0 && !runStream.thinkingTokens && !runStream.plan ? (
                      <div className="bg-muted/50 rounded-lg p-6 min-h-[300px] flex flex-col items-center justify-center text-center">
                        <Lightbulb className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          The agent's reasoning process will appear here as it works on your assignment.
                        </p>
                      </div>
                    ) : (
                      <>
                        {reasoningEntries.map((entry, index) => (
                          <div key={index} className="bg-muted/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-muted-foreground">Reasoning #{index + 1}</h4>
                              <span className="text-[10px] text-muted-foreground">
                                {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
                            </div>
                          </div>
                        ))}
                        {runStream.thinkingTokens && (
                          <div className="bg-muted/50 rounded-lg p-4 border-2 border-primary/20">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Thinking...
                              </h4>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{runStream.thinkingTokens}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="h-full m-0 p-4">
                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {runStream.activityLog.length === 0 ? (
                      <div className="bg-muted/50 rounded-lg p-6 min-h-[300px] flex flex-col items-center justify-center text-center">
                        <Activity className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Run activity will appear here — tool calls, status changes, and results.
                        </p>
                      </div>
                    ) : (
                      runStream.activityLog.map((entry) => (
                        <ActivityLogEntry key={entry.id} entry={entry} />
                      ))
                    )}

                    {/* Tool calls in progress */}
                    {runStream.toolCalls.filter(tc => tc.status === 'running').map((tc) => (
                      <div key={tc.id} className="flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <Loader2 className="w-4 h-4 animate-spin text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{tc.tool_name}</span>
                            <Badge variant="secondary" className="text-[10px]">running</Badge>
                          </div>
                          <Collapsible>
                            <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground">
                              Show arguments
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <pre className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded p-2 overflow-x-auto">
                                {JSON.stringify(tc.args, null, 2)}
                              </pre>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>

      </div>
    </div>
  );
};

// Activity log entry component
const ActivityLogEntry = ({ entry }: { entry: ActivityEntry }) => {
  const getIcon = () => {
    switch (entry.type) {
      case 'status':
        return <Circle className="w-3.5 h-3.5 text-primary" />;
      case 'tool_call':
        return <Activity className="w-3.5 h-3.5 text-accent-foreground" />;
      case 'tool_result': {
        const success = entry.data.success as boolean;
        return success
          ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          : <XCircle className="w-3.5 h-3.5 text-destructive" />;
      }
      case 'error':
        return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      case 'snapshot':
        return <Circle className="w-3.5 h-3.5 text-muted-foreground" />;
      case 'message':
        return <CheckCircle className="w-3.5 h-3.5 text-primary" />;
      case 'distill':
        return <Circle className="w-3.5 h-3.5 text-muted-foreground" />;
      case 'reasoning':
        return <Lightbulb className="w-3.5 h-3.5 text-amber-500" />;
      case 'approval': {
        const approved = entry.data.approved as boolean | undefined;
        return approved === true
          ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          : approved === false
            ? <XCircle className="w-3.5 h-3.5 text-destructive" />
            : <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />;
      }
      default:
        return <Circle className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getLabel = () => {
    switch (entry.type) {
      case 'status': {
        const status = (entry.data.status as string) || (entry.data.event as string) || '';
        const tokenUsage = entry.data.token_usage as { total_tokens?: number; llm_calls?: number } | undefined;
        if (status === 'completed' && tokenUsage?.total_tokens) {
          return `Run ${status} · ${tokenUsage.total_tokens.toLocaleString()} tokens (${tokenUsage.llm_calls} LLM calls)`;
        }
        return `Run ${status}`;
      }
      case 'tool_call':
        return `Tool call: ${entry.data.tool_name}`;
      case 'tool_result':
        return `Tool result: ${entry.data.tool_name} ${entry.data.success ? '✓' : '✗'}`;
      case 'error':
        return `Error: ${entry.data.error}`;
      case 'snapshot':
        return `Context loaded (${entry.data.memories_count || 0} memories)`;
      case 'message':
        return `Message created (${entry.data.role})`;
      case 'distill':
        return 'Memory distillation triggered';
      case 'reasoning':
        return `LLM reasoning (step ${entry.data.step_index})`;
      case 'approval': {
        const toolName = entry.data.tool_name as string;
        const approved = entry.data.approved as boolean | undefined;
        if (approved === true) return `Approved: ${toolName}`;
        if (approved === false) return `Rejected: ${toolName}`;
        return `Approval requested: ${toolName}`;
      }
      default:
        return JSON.stringify(entry.data);
    }
  };

  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="mt-0.5 flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{getLabel()}</p>
        {entry.type === 'tool_call' && entry.data.args && (
          <Collapsible>
            <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground">
              Show details
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded p-2 overflow-x-auto">
                {JSON.stringify(entry.data.args, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}
        {entry.type === 'tool_result' && entry.data.output_summary && (
          <p className="text-xs text-muted-foreground mt-1">{entry.data.output_summary as string}</p>
        )}
        {entry.type === 'snapshot' && Array.isArray(entry.data.memories) && (entry.data.memories as Array<{id: string; content: string}>).length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground">
              Show memories used
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mt-1 space-y-1">
                {(entry.data.memories as Array<{id: string; content: string}>).map((mem) => (
                  <li key={mem.id} className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                    {mem.content}
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}
        {entry.type === 'reasoning' && (entry.data.content || entry.data.summary) && (
          <Collapsible>
            <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground">
              Show reasoning
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                {(entry.data.content as string) || (entry.data.summary as string)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground flex-shrink-0">
        {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
};

export default AssignmentPage;
