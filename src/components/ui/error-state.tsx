import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Failed to load records",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <AlertCircle className="size-4 shrink-0" />
        <div>
          <span className="font-semibold text-destructive">{title}:</span>{" "}
          <span className="text-destructive/90">{message}</span>
        </div>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/15 shrink-0"
        >
          Try Again
        </Button>
      )}
    </div>
  );
}
