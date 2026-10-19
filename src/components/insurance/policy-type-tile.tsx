import { HeartPulse, Car, Shield, Home, Briefcase, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PolicyCategory {
  id: string;
  label: string;
  icon: typeof Shield;
  count?: number;
}

export const DEFAULT_POLICY_CATEGORIES: PolicyCategory[] = [
  { id: "all", label: "All Policies", icon: Layers },
  { id: "health", label: "Health Shield", icon: HeartPulse },
  { id: "auto", label: "Motor & Auto", icon: Car },
  { id: "life", label: "Term Life", icon: Shield },
  { id: "property", label: "Property / Home", icon: Home },
];

interface PolicyTypeTileProps {
  categories?: PolicyCategory[];
  selectedCategory: string;
  onSelect: (categoryId: string) => void;
  className?: string;
}

export function PolicyTypeTiles({
  categories = DEFAULT_POLICY_CATEGORIES,
  selectedCategory,
  onSelect,
  className,
}: PolicyTypeTileProps) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-5 gap-2.5", className)}>
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isSelected = selectedCategory === cat.id;

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={cn(
              "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer",
              isSelected
                ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs ring-1 ring-primary/30"
                : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/40"
            )}
          >
            <span
              className={cn(
                "grid size-8 place-items-center rounded-lg shrink-0",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{cat.label}</div>
              {typeof cat.count === "number" && (
                <div className="text-[10px] text-muted-foreground font-mono">{cat.count} active</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
