import { SignIn, SignUp } from "@clerk/clerk-react";
import { useState } from "react";
import { X, Lock, UserPlus, LogIn } from "lucide-react";

export function FloatingAuthModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Floating Card */}
      <div className="relative w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 grid size-8 place-items-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Close modal"
        >
          <X className="size-4" />
        </button>

        {/* Branding header */}
        <div className="mb-4 flex flex-col items-center text-center">
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

        {/* Clerk Auth Component */}
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
