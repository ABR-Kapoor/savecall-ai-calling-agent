import { createFileRoute, Link } from "@tanstack/react-router";
import { SignIn } from "@clerk/clerk-react";
import { ArrowLeft, Lock } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — SaveCall AI Receptionist" },
      { name: "description", content: "Access your AI receptionist dashboard." },
      { property: "og:title", content: "Sign in — SaveCall" },
      { property: "og:description", content: "Access your AI receptionist dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
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
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            <Lock className="size-3" /> Secure Console Sign In
          </div>
        </div>

        <div className="flex justify-center">
          <SignIn routing="hash" fallbackRedirectUrl="/dashboard" />
        </div>
      </div>
    </div>
  );
}
