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
  Lock,
} from "lucide-react";
import type { ReactNode } from "react";

import { useClerk, UserButton, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getTenantSettings } from "@/lib/insurance.functions";

const NAV_OPERATIONS = [
  { to: "/dashboard", label: "Operations Overview", icon: LayoutDashboard },
  { to: "/calls", label: "Live Calls & Transcripts", icon: PhoneCall },
  { to: "/claims", label: "Claims Intake & FNOL", icon: ShieldCheck },
  { to: "/policies", label: "Policy Portfolio", icon: FileText },
  { to: "/change-requests", label: "Staff Approvals Queue", icon: CheckSquare },
] as const;

const NAV_INTELLIGENCE = [
  { to: "/agent", label: "Insurance Voice Studio", icon: Bot },
  { to: "/train", label: "Policy Knowledge Store", icon: BookOpen },
  { to: "/voice", label: "Voice Call Simulator", icon: Mic },
  { to: "/audit", label: "Audit & Compliance Log", icon: ShieldAlert },
] as const;

const NAV_CARRIER = [
  { to: "/onboarding", label: "Carrier Setup", icon: Sparkles },
  { to: "/settings", label: "Tenant & API Settings", icon: Settings },
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
    queryKey: ["tenant-settings", user?.id],
    queryFn: () =>
      getTenantSettings({
        data: {
          clerkUserId: user?.id,
          userEmail: user?.primaryEmailAddress?.emailAddress,
          userName: user?.fullName || undefined,
        },
      }),
  });

  const tenantConfig = (tenant?.branding_config as any) || {};
  const companyName = tenant?.name || "InsurCall Carrier Operations";
  const planRaw = tenantConfig.plan || "enterprise";
  const planDisplay = planRaw.charAt(0).toUpperCase() + planRaw.slice(1);

  const signOut = async () => {
    try {
      await clerk.signOut();
    } catch (_) {}
    window.location.href = "/";
  };

  const allNav = [...NAV_OPERATIONS, ...NAV_INTELLIGENCE, ...NAV_CARRIER];

  return (
    <div className="flex min-h-screen bg-[#FAF9F6] text-[#111827] antialiased font-sans">
      {/* Sidebar Desktop: Fixed & Clean Bright Theme with Cool Dark Elements */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex shadow-xs sticky top-0 h-screen select-none z-20">
        {/* Workspace Brand / Header */}
        <div className="mb-4 pb-3 border-b border-slate-100">
          <Link to="/dashboard" className="flex items-center justify-between px-1 py-1 group">
            <div className="flex items-center gap-2">
              <img
                src="/01_logo_only_transparent.png"
                alt="InsurCall Emblem"
                className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <span className="font-display text-base font-extrabold tracking-tight text-[#111827]">
                Insur<span className="text-[#087F8C]">Call</span>
              </span>
            </div>
            <span className="rounded-full bg-[#172033] text-white px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold">
              {planDisplay}
            </span>
          </Link>
          <div className="px-1 pt-1.5 text-[11px] text-slate-500 font-mono font-medium truncate" title={companyName}>
            {companyName}
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 space-y-5 overflow-hidden pr-1">
          {/* Operations Section */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Operations
            </div>
            <nav className="space-y-0.5">
              {NAV_OPERATIONS.map((item) => {
                const isActive = path === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900",
                      isActive && "bg-[#E6F6F7] text-[#087F8C] font-semibold border border-[#087F8C]/20 shadow-2xs",
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0", isActive ? "text-[#087F8C]" : "text-slate-400")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Intelligence & Voice Section */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              AI Voice & Knowledge
            </div>
            <nav className="space-y-0.5">
              {NAV_INTELLIGENCE.map((item) => {
                const isActive = path === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900",
                      isActive && "bg-[#E6F6F7] text-[#087F8C] font-semibold border border-[#087F8C]/20 shadow-2xs",
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0", isActive ? "text-[#087F8C]" : "text-slate-400")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Carrier Administration */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Carrier Governance
            </div>
            <nav className="space-y-0.5">
              {NAV_CARRIER.map((item) => {
                const isActive = path === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900",
                      isActive && "bg-[#E6F6F7] text-[#087F8C] font-semibold border border-[#087F8C]/20 shadow-2xs",
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0", isActive ? "text-[#087F8C]" : "text-slate-400")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Card & Sign Out */}
        <div className="border-t border-slate-100 pt-3 mt-auto">
          <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <UserButton afterSignOutUrl="/" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user?.fullName || user?.firstName || "Staff Adjuster"}
                </p>
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  {user?.primaryEmailAddress?.emailAddress || "adjuster@insurcall.ai"}
                </p>
              </div>
            </div>
            <button
              onClick={signOut}
              title="Sign Out"
              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area: Bright & Polished */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-display text-base font-bold text-slate-900 leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[11px] text-slate-500 font-mono leading-none mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 rounded-full border-slate-200 text-xs font-mono text-slate-700 hover:text-black hover:bg-slate-100"
            >
              <Link to="/voice">
                <Mic className="size-3 mr-1.5 text-[#087F8C]" />
                Test Voice Call
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-8 rounded-full bg-[#172033] hover:bg-[#1F2937] text-white text-xs font-mono font-medium"
            >
              <Link to="/claims">
                <ShieldCheck className="size-3 mr-1.5 text-[#10A6AE]" />
                New FNOL Intake
              </Link>
            </Button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
