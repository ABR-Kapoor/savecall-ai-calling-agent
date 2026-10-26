import { createFileRoute, Link } from "@tanstack/react-router";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { useState } from "react";
import { ArrowLeft, Lock, LogIn, UserPlus } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In: InsurCall AI Receptionist" },
      { name: "description", content: "Access your AI receptionist dashboard." },
      { property: "og:title", content: "Sign in: InsurCall" },
      { property: "og:description", content: "Access your AI receptionist dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-12">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial from-primary/5 via-background to-background pointer-events-none" />

      {/* Floating Auth Card */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="size-3.5" /> Back to Home
          </Link>
          <img
            src="/02_logo_with_InsurCall_light_transparent.png"
            alt="InsurCall"
            className="h-9 w-auto object-contain mb-2"
          />
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary mb-3">
            <Lock className="size-3" /> Secure Enterprise Portal
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 text-xs font-medium w-full max-w-xs mb-2">
            <button
              onClick={() => setAuthMode("signin")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                authMode === "signin"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LogIn className="size-3.5" /> Sign In
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                authMode === "signup"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="size-3.5" /> Register Carrier
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          {authMode === "signin" ? (
            <SignIn routing="hash" fallbackRedirectUrl="/dashboard" />
          ) : (
            <SignUp routing="hash" fallbackRedirectUrl="/onboarding" />
          )}
        </div>
      </div>
    </div>
  );
}
