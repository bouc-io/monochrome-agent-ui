import { ArrowDownToLine, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AutoScrollToggleProps {
  enabled: boolean;
  onToggle: () => void;
  /** Position the toggle as a floating button on the right side */
  floating?: boolean;
  /** Custom class name */
  className?: string;
}

export const AutoScrollToggle = ({
  enabled,
  onToggle,
  floating = false,
  className,
}: AutoScrollToggleProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "h-8 w-8 p-0 transition-all duration-200",
              enabled
                ? "text-primary bg-primary/10 hover:bg-primary/20"
                : "text-muted-foreground hover:text-foreground",
              floating &&
                "fixed z-50 rounded-full shadow-lg border border-border bg-background hover:bg-accent",
              className,
            )}
          >
            {enabled ? <ArrowDownToLine size={16} /> : <ArrowDown size={16} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Auto-scroll: {enabled ? "On" : "Off"}</p>
          <p className="text-xs text-muted-foreground">
            {enabled
              ? "Content will scroll into view"
              : "Manual scrolling only"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
