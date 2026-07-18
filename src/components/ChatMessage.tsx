import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Copy, ThumbsUp, ThumbsDown, RotateCw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAgentApi } from "@/lib/agentApi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import logger from '@/lib/logger';

const log = logger.child('ChatMessage');

interface ChatMessageProps {
  message: string;
  isBot?: boolean;
  onResubmit?: () => void;
  timestamp?: Date;
  runId?: string;
  assignmentId?: string;
  initialFeedback?: 'positive' | 'negative';
}

export const ChatMessage = ({ message, isBot = false, onResubmit, timestamp, runId, assignmentId, initialFeedback }: ChatMessageProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { submitRunFeedback } = useAgentApi();

  const [feedbackState, setFeedbackState] = useState<'none' | 'positive' | 'negative'>(initialFeedback ?? 'none');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Format timestamp
  const formatTime = (date?: Date) => {
    if (!date) return null;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Strip reasoning from message (reasoning is displayed in workspace tab)
  const getMainContent = (text: string) => {
    return text.replace(/<think>.*?<\/think>/s, "").trim();
  };

  const mainContent = getMainContent(message);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast({
        description: t.messageCopied,
      });
    } catch (error) {
      log.error('Failed to copy message:', error);
      toast({
        description: t.copyFailed,
        variant: "destructive",
      });
    }
  };

  const handleFeedback = async (type: 'like' | 'dislike') => {
    if (!runId || !assignmentId) {
      log.warn('Feedback skipped: missing runId or assignmentId');
      return;
    }
    const rating = type === 'like' ? 'positive' : 'negative';
    setFeedbackState(rating);
    if (type === 'dislike') {
      setShowCommentBox(true);
      // Don't submit yet — wait for comment submission
    } else {
      try {
        await submitRunFeedback(assignmentId, runId, 'positive');
        setShowCommentBox(false);
      } catch (error) {
        log.error('Failed to submit feedback:', error);
      }
    }
  };

  const handleCommentSubmit = async () => {
    if (!runId || !assignmentId) return;
    setSubmitting(true);
    try {
      await submitRunFeedback(assignmentId, runId, 'negative', comment.trim() || undefined);
      setShowCommentBox(false);
    } catch (error) {
      log.error('Failed to submit feedback comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentSkip = async () => {
    if (!runId || !assignmentId) return;
    setSubmitting(true);
    try {
      await submitRunFeedback(assignmentId, runId, 'negative');
    } catch (error) {
      log.error('Failed to submit feedback:', error);
    } finally {
      setSubmitting(false);
      setShowCommentBox(false);
    }
  };

  return (
    <div className={cn("flex w-full flex-col", isBot ? "items-start" : "items-end")}>
      {/* Main message bubble */}
      <div className={cn("flex w-full", isBot ? "justify-start" : "justify-end")}>
        <div
          className={cn(
            "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
            isBot
              ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
              : "bg-gray-300 text-gray-900 dark:bg-gray-600 dark:text-white"
          )}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {mainContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Action buttons and timestamp */}
      <div className={cn("mt-1 flex items-center gap-2", isBot ? "self-start" : "self-end")}>
        {/* Timestamp */}
        {timestamp && (
          <span className="text-[10px] text-muted-foreground">
            {formatTime(timestamp)}
          </span>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className={cn(
            "h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-600",
            "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          )}
          aria-label={isBot ? t.copyAiMessage : t.copyUserMessage}
        >
          <Copy size={12} />
        </Button>

        {!isBot && onResubmit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResubmit}
            className={cn(
              "h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20",
              "text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            )}
            aria-label="Resubmit message"
          >
            <RotateCw size={12} />
          </Button>
        )}

        {isBot && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback('like')}
              className={cn(
                "h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900/20",
                feedbackState === 'positive'
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
              )}
              aria-label={t.goodResponse}
            >
              <ThumbsUp size={12} fill={feedbackState === 'positive' ? 'currentColor' : 'none'} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback('dislike')}
              className={cn(
                "h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20",
                feedbackState === 'negative'
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              )}
              aria-label={t.badResponse}
            >
              <ThumbsDown size={12} fill={feedbackState === 'negative' ? 'currentColor' : 'none'} />
            </Button>
          </>
        )}
        </div>
      </div>

      {/* Comment box — appears on thumbs down */}
      {isBot && showCommentBox && (
        <div className="mt-2 self-start w-full max-w-[80%] rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-3 flex flex-col gap-2">
          <textarea
            className="w-full text-sm bg-transparent border-none outline-none resize-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            placeholder="What went wrong? (optional)"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            disabled={submitting}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCommentSkip}
              disabled={submitting}
              className="h-7 px-3 text-xs text-gray-500"
            >
              Skip
            </Button>
            <Button
              size="sm"
              onClick={handleCommentSubmit}
              disabled={submitting}
              className="h-7 px-3 text-xs"
            >
              {submitting ? 'Sending...' : 'Submit'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
