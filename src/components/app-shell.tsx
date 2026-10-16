import { Link, useRouter } from "@tanstack/react-router";
import {
  FileText,
  ShieldAlert,
  LayoutDashboard,
  LogOut,
  Mic,
  PhoneCall,
  Settings,
  ShieldCheck,
  Users,
  CheckSquare,
} from "lucide-react";
import type { ReactNode } from "react";

import { useClerk, UserButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/policies", label: "Policies", icon: FileText },
  { to: "/claims", label: "Claims", icon: ShieldCheck },
  { to: "/change-requests", label: "Approvals", icon: CheckSquare },
  { to: "/calls", label: "Voice Sessions", icon: PhoneCall },
  { to: "/audit", label: "Audit Logs", icon: ShieldAlert },
  { to: "/voice", label: "Customer Voice UI", icon: Mic },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const path = router.state.location.pathname;

  const clerk = useClerk();
  const signOut = async () => {
    try {
      await clerk.signOut();
    } catch (_) {}
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Link to="/dashboard" className="mb-6 flex items-center gap-3 px-2">
          <span className="grid size-9 place-items-center rounded-lg bg-cyan-600 text-white font-bold shadow">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div className="flex flex-col">
            <span className="font-display text-base font-bold leading-tight tracking-tight">
              SaveCall
            </span>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
              Insurance AI
            </span>
          </div>
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                path === item.to && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 border-t border-sidebar-border pt-3">
          <div className="flex items-center gap-2 px-2 py-1">
            <UserButton afterSignOutUrl="/" />
            <span className="text-xs text-muted-foreground font-medium">Clerk Staff Account</span>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground" onClick={signOut}>
            <LogOut className="size-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-card/40 px-6 py-4 backdrop-blur">
          <h1 className="font-display text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </header>
        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs text-muted-foreground",
                path === item.to && "bg-accent font-medium text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
