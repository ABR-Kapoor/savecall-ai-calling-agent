import { Link, useRouter } from "@tanstack/react-router";
import {
  FileText,
  ShieldAlert,
  LayoutDashboard,
  LogOut,
  Mic,
  PhoneCall,
  PhoneForwarded,
  Settings,
  ShieldCheck,
  CheckSquare,
  Bot,
  BookOpen,
  Sparkles,
  Radio,
  ExternalLink,
  Lock,
  MessageSquare,
} from "lucide-react";
import type { ReactNode } from "react";

import { useClerk, UserButton, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getTenantSettings } from "@/lib/insurance.functions";

interface BrandingConfig {
  plan?: string;
  [key: string]: unknown;
}

const NAV_CORE = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/whatsapp", label: "WhatsApp Inbox", icon: MessageSquare },
  { to: "/calls", label: "Voice Calls", icon: PhoneCall },
  { to: "/agent", label: "AI Agent", icon: Bot },
  { to: "/train", label: "Knowledge & Training", icon: BookOpen },
] as const;

const NAV_GOVERNANCE = [
  { to: "/claims", label: "Claims Intake & FNOL", icon: ShieldCheck },
  { to: "/change-requests", label: "Approvals & Handoffs", icon: CheckSquare },
  { to: "/policies", label: "Insurance Records", icon: FileText },
  { to: "/phone", label: "Telephony & Forwarding", icon: Radio },
  { to: "/settings", label: "Settings & Security", icon: Settings },
  { to: "/audit", label: "Activity & Audit", icon: ShieldAlert },
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

  const tenantConfig = (tenant?.branding_config as BrandingConfig | null) || {};
  const companyName = tenant?.name || "Workspace";
  const planRaw = typeof tenantConfig.plan === "string" ? tenantConfig.plan : "enterprise";
  const planDisplay = planRaw.charAt(0).toUpperCase() + planRaw.slice(1);

  const signOut = async () => {
    try {
      await clerk.signOut();
    } catch (_) {}
    window.location.href = "/";
  };

  const allNav = [...NAV_CORE, ...NAV_GOVERNANCE];

  return (
    <div className="flex min-h-screen bg-[#FAF9F6] text-[#111827] antialiased font-sans">
      {/* Sidebar Desktop: Fixed & Clean Bright Theme with Cool Dark Elements */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex shadow-xs sticky top-0 h-screen select-none z-20">
        {/* Workspace Brand & Organization Badge */}
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
            <span className="rounded-full bg-teal-50 text-[#087F8C] border border-teal-200/80 px-2 py-0.5 text-[10px] font-semibold tracking-wide capitalize">
              {planDisplay}
            </span>
          </Link>

          {/* Clean Organization Identity Chip */}
          <div className="mt-2.5 flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-1.5 text-xs text-slate-700 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="min-w-0">
                <span className="block font-semibold truncate text-xs text-slate-900" title={companyName}>
                  {companyName}
                </span>
                <span className="block text-[10px] text-slate-400 capitalize">
                  Insurance Agency
                </span>
              </div>
            </div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider shrink-0 pl-1">
              Live
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 space-y-5 overflow-hidden pr-1">
          {/* Core Platform Section */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Core Platform
            </div>
            <nav className="space-y-0.5">
              {NAV_CORE.map((item) => {
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

          {/* Operations & Governance */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Operations & Governance
            </div>
            <nav className="space-y-0.5">
              {NAV_GOVERNANCE.map((item) => {
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
                <p className="text-[10px] text-slate-500 truncate">
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
                <p className="text-xs text-slate-500 leading-normal mt-0.5 font-normal">
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
              className="h-8 rounded-full border-teal-200 bg-teal-50/50 text-xs font-medium text-[#087F8C] hover:text-[#076C77] hover:bg-teal-100/50"
            >
              <Link to="/voice">
                <Mic className="size-3 mr-1.5 text-[#087F8C]" />
                Live Call
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 rounded-full border-slate-200 text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100"
            >
              <Link to="/whatsapp">
                <MessageSquare className="size-3 mr-1.5 text-[#087F8C]" />
                WhatsApp Inbox
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-8 rounded-full bg-[#172033] hover:bg-[#1F2937] text-white text-xs font-medium"
            >
              <Link to="/train">
                <BookOpen className="size-3 mr-1.5 text-[#10A6AE]" />
                Train Assistant
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
