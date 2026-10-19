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
  CheckSquare,
  Bot,
  BookOpen,
  Sparkles,
  Radio,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import type { ReactNode } from "react";

import { useClerk, UserButton, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getTenantSettings } from "@/lib/insurance.functions";

const NAV_MAIN = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agent", label: "Assistant Studio", icon: Bot },
  { to: "/train", label: "Business Knowledge", icon: BookOpen },
  { to: "/calls", label: "Call History", icon: PhoneCall },
  { to: "/voice", label: "Interactive Test Call", icon: Mic },
] as const;

const NAV_INSURANCE = [
  { to: "/policies", label: "Policies", icon: FileText },
  { to: "/claims", label: "Claims", icon: ShieldCheck },
  { to: "/change-requests", label: "Pending Approvals", icon: CheckSquare },
  { to: "/audit", label: "Audit Trail", icon: ShieldAlert },
] as const;

const NAV_MANAGEMENT = [
  { to: "/onboarding", label: "Guided Setup", icon: Sparkles },
  { to: "/settings", label: "Workspace Settings", icon: Settings },
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
  const { user } = useUser();
  const { data: tenant } = useQuery({
    queryKey: ["tenant-settings"],
    queryFn: () => getTenantSettings(),
  });

  const tenantConfig = (tenant?.branding_config as any) || {};
  const companyName = tenant?.name || "Company Workspace";
  const planRaw = tenantConfig.plan || "starter";
  const planDisplay = planRaw.charAt(0).toUpperCase() + planRaw.slice(1);

  const signOut = async () => {
    try {
      await clerk.signOut();
    } catch (_) {}
    window.location.href = "/";
  };

  const allNav = [...NAV_MAIN, ...NAV_INSURANCE, ...NAV_MANAGEMENT];

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased">
      {/* Sidebar Desktop - Fixed & Not Scrollable */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card p-4 md:flex shadow-xs sticky top-0 h-screen select-none z-20">
        {/* Workspace Brand / Header */}
        <div className="mb-4">
          <Link to="/dashboard" className="flex items-center justify-between px-2 py-1 group">
            <img
              src="/02_logo_with_InsurCall_light_transparent.png"
              alt="InsurCall Logo"
              className="h-8 w-auto max-w-[150px] object-contain transition-transform group-hover:scale-[1.02]"
            />
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary capitalize">
              {planDisplay}
            </span>
          </Link>
          <div className="px-2 pt-1 text-[11px] text-muted-foreground font-medium truncate" title={companyName}>
            {companyName}
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 space-y-4 overflow-hidden pr-1">
          {/* Main Section */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Main
            </div>
            <nav className="space-y-0.5">
              {NAV_MAIN.map((item) => {
                const isActive = path === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground",
                      isActive && "bg-primary/10 text-primary font-semibold hover:bg-primary/15",
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Insurance Ops */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2.5 pb-1">
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Insurance Ops
              </span>
              <span className="text-[10px] font-medium text-primary">Vertical</span>
            </div>
            <nav className="space-y-0.5">
              {NAV_INSURANCE.map((item) => {
                const isActive = path === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground",
                      isActive && "bg-primary/10 text-primary font-semibold hover:bg-primary/15",
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Management */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Management
            </div>
            <nav className="space-y-0.5">
              {NAV_MANAGEMENT.map((item) => {
                const isActive = path === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground",
                      isActive && "bg-primary/10 text-primary font-semibold hover:bg-primary/15",
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Usage Allowance Card in Sidebar */}
        <div className="mt-auto pt-3 border-t border-border space-y-3">
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-foreground">{planDisplay} Plan</span>
              <span className="text-primary font-bold">12 / 15 mins</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: "80%" }} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              3 min remaining. Upgrade for unlimited voice concurrency.
            </p>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 min-w-0">
              <UserButton afterSignOutUrl="/" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-foreground leading-tight truncate">
                  {user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Team Member" : "Admin Staff"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {user?.primaryEmailAddress?.emailAddress || "Workspace Owner"}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive shrink-0"
              title="Sign out"
              onClick={signOut}
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card/90 px-4 sm:px-6 backdrop-blur">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link to="/dashboard" className="md:hidden shrink-0">
              <img
                src="/01_logo_only_transparent.png"
                alt="InsurCall"
                className="size-7 object-contain"
              />
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold tracking-tight text-foreground truncate">
                {title}
              </h1>
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Status indicator */}
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Receptionist Live</span>
            </div>

            {/* Quick Test Call CTA */}
            <Link to="/voice">
              <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-xs">
                <Mic className="size-3.5" />
                <span className="hidden sm:inline">Interactive</span> Test Call
              </Button>
            </Link>
          </div>
        </header>

        {/* Mobile Horizontal Nav Bar */}
        <div className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
          {allNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground",
                path === item.to && "bg-primary/10 text-primary font-semibold",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
