
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, Plus, Square } from "lucide-react";
import logger from '@/lib/logger';

const log = logger.child('ChatInput');
import { useLanguage } from "@/context/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  isStreaming?: boolean;
  onStop?: () => void;
}

export const ChatInput = ({ onSend, disabled, inputRef, isStreaming, onStop }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const internalInputRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef || internalInputRef;

  // Handle Escape key to clear input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setMessage("");
      return;
    }
    
    // Ctrl+Enter or Cmd+Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
      return;
    }
    
    // Enter without shift to send
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage("");
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      log.info('Selected files:', files);
      // TODO: Implement file handling functionality
    }
  };

  return (
    <div className="bg-background">
      <form onSubmit={handleSubmit} className="flex gap-3 items-end p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="h-[30px] w-[30px] border border-border hover:bg-accent bg-background"
              aria-label={t.addFiles}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-32">
            <DropdownMenuItem onClick={handleFileAttach} className="cursor-pointer">
              {t.attach}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="*/*"
        />
        
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message... (Ctrl+Enter or Enter to send, Esc to clear)"
            className="resize-none min-h-[60px] max-h-[200px] bg-background border-input text-foreground placeholder:text-muted-foreground"
            disabled={disabled}
            onKeyDown={handleKeyDown}
          />
        </div>
        {isStreaming && onStop ? (
          <Button 
            type="button"
            size="icon" 
            onClick={onStop}
            className="h-[60px] w-[60px] bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <Square className="h-5 w-5 fill-current" />
          </Button>
        ) : (
          <Button 
            type="submit" 
            size="icon" 
            disabled={disabled || !message.trim()}
            className="h-[60px] w-[60px] bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <SendHorizontal className="h-5 w-5" />
          </Button>
        )}
      </form>
    </div>
  );
};
