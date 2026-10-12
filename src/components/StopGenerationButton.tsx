import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StopGenerationButtonProps {
  onStop: () => void;
  className?: string;
}

export const StopGenerationButton = ({
  onStop,
  className,
}: StopGenerationButtonProps) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onStop}
      className={`flex items-center gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground ${className}`}
    >
      <Square className="h-4 w-4 fill-current" />
      Stop
    </Button>
  );
};
