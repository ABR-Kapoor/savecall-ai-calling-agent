import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  supportingText?: string;
  destination?: string;
  trendText?: string;
  trendTone?: "positive" | "negative" | "neutral";
  className?: string;
}

export function MetricCard({
  label,
  value,
  icon,
  supportingText,
  destination,
  trendText,
  trendTone = "neutral",
  className,
}: MetricCardProps) {
  const content = (
    <Card
      className={cn(
        "border border-border bg-card shadow-xs transition-all",
        destination && "hover:border-primary/40 hover:shadow-xs cursor-pointer",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon && (
          <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
            {icon}
          </span>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="font-display text-2xl font-bold tracking-tight text-foreground font-mono">
          {value}
        </div>
        {(supportingText || trendText) && (
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
            {trendText && (
              <span
                className={cn(
                  "font-medium",
                  trendTone === "positive" && "text-emerald-700",
                  trendTone === "negative" && "text-rose-700",
                  trendTone === "neutral" && "text-muted-foreground"
                )}
              >
                {trendText}
              </span>
            )}
            {supportingText && <span>{supportingText}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (destination) {
    return <Link to={destination}>{content}</Link>;
  }

  return content;
}
