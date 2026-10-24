import { cn } from "@/lib/utils";

export const TypingIndicator = () => {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full",
                  "animate-bounce",
                )}
                style={{
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: "0.6s",
                }}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground ml-1">
            AI is thinking...
          </span>
        </div>
      </div>
    </div>
  );
};
