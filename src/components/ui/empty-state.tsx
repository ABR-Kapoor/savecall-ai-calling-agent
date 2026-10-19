import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode | undefined;
  title: string;
  description?: string | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  className?: string | undefined;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border rounded-xl bg-card/50",
        className
      )}
    >
      {icon && <div className="text-muted-foreground/60 mb-3">{icon}</div>}
      <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          size="sm"
          onClick={onAction}
          className="mt-4 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
