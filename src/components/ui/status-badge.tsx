import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/insurance/status-presentation";

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  icon?: ReactNode;
  className?: string;
  size?: "sm" | "md";
}

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-blue-50 text-blue-800 border-blue-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-rose-50 text-rose-800 border-rose-200",
};

export function StatusBadge({
  label,
  tone = "neutral",
  icon,
  className,
  size = "sm",
}: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border items-center gap-1 inline-flex shrink-0 transition-colors",
        size === "sm" ? "text-[10px] py-0.5 px-2" : "text-xs py-1 px-2.5",
        TONE_CLASSES[tone] || TONE_CLASSES.neutral,
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </Badge>
  );
}
