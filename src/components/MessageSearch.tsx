import {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";

interface MessageSearchProps {
  messages: { text: string; isBot: boolean; timestamp: Date }[];
  onHighlightMessage: (index: number | null) => void;
}

export interface MessageSearchRef {
  open: () => void;
}

export const MessageSearch = forwardRef<MessageSearchRef, MessageSearchProps>(
  ({ messages, onHighlightMessage }, ref) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [matchingIndices, setMatchingIndices] = useState<number[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Expose open method to parent
    useImperativeHandle(ref, () => ({
      open: () => setIsOpen(true),
    }));

    // Focus input when search opens
    useEffect(() => {
      if (isOpen && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isOpen]);

    // Search messages when query changes
    useEffect(() => {
      if (!searchQuery.trim()) {
        setMatchingIndices([]);
        setCurrentMatchIndex(0);
        onHighlightMessage(null);
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
        onHighlightMessage(indices[0]);
      } else {
        onHighlightMessage(null);
      }
    }, [searchQuery, messages, onHighlightMessage]);

    const handlePrevious = () => {
      if (matchingIndices.length === 0) return;
      const newIndex =
        currentMatchIndex === 0
          ? matchingIndices.length - 1
          : currentMatchIndex - 1;
      setCurrentMatchIndex(newIndex);
      onHighlightMessage(matchingIndices[newIndex]);
    };

    const handleNext = () => {
      if (matchingIndices.length === 0) return;
      const newIndex =
        currentMatchIndex === matchingIndices.length - 1
          ? 0
          : currentMatchIndex + 1;
      setCurrentMatchIndex(newIndex);
      onHighlightMessage(matchingIndices[newIndex]);
    };

    const handleClose = () => {
      setIsOpen(false);
      setSearchQuery("");
      setMatchingIndices([]);
      setCurrentMatchIndex(0);
      onHighlightMessage(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "Enter") {
        if (e.shiftKey) {
          handlePrevious();
        } else {
          handleNext();
        }
      }
    };

    if (!isOpen) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="h-8 w-8 p-0"
          title={t.searchMessages || "Search messages"}
        >
          <Search className="h-4 w-4" />
        </Button>
      );
    }

    return (
      <div className="flex items-center gap-2 bg-background border border-border rounded-md px-2 py-1">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={t.searchPlaceholder || "Search messages..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-40 md:w-56 border-0 focus-visible:ring-0 px-1"
        />
        {matchingIndices.length > 0 && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {currentMatchIndex + 1}/{matchingIndices.length}
          </span>
        )}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={matchingIndices.length === 0}
            className="h-6 w-6 p-0"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            disabled={matchingIndices.length === 0}
            className="h-6 w-6 p-0"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  },
);

MessageSearch.displayName = "MessageSearch";
