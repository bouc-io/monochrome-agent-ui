
import { cn } from "@/lib/utils";

export const LoadingDots = () => {
  return (
    <div className="flex space-x-1 items-center p-1">
      {[1, 2, 3].map((dot) => (
        <div
          key={dot}
          className={cn(
            "w-2 h-2 bg-foreground/80 rounded-full animate-fade-in",
            "animate-[fade-in_0.6s_ease-in-out_infinite_alternate]"
          )}
          style={{
            animationDelay: `${dot * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
};
