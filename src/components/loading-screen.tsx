import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  timeoutSeconds?: number;
  onRetry?: () => void;
  fullscreen?: boolean;
}

export function InsurCallLoadingScreen({
  message = "Preparing your insurance workspace...",
  submessage = "Loading carrier settings, policy models, and verified company knowledge.",
  timeoutSeconds = 12,
  onRetry,
  fullscreen = true,
}: LoadingScreenProps) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!timeoutSeconds) return;
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, timeoutSeconds * 1000);
    return () => clearTimeout(timer);
  }, [timeoutSeconds]);

  const content = (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto"
    >
      {/* InsurCall Emblem */}
      <div className="mb-6 flex items-center justify-center">
        <div className="relative size-16 rounded-2xl bg-white border border-slate-200/80 p-3 shadow-sm flex items-center justify-center">
          <img
            src="/01_logo_only_transparent.png"
            alt="InsurCall Emblem"
            className="size-full object-contain"
          />
          <span className="absolute -bottom-1 -right-1 size-3.5 rounded-full bg-[#087F8C] ring-2 ring-white" />
        </div>
      </div>

      {/* Animated SVG Agent */}
      <div className="relative w-48 h-36 flex items-center justify-center overflow-hidden mb-4">
        <img
          src="/loading-agent.svg"
          alt="InsurCall Assistant Loading Animation"
          className="w-full h-full object-contain filter drop-shadow-xs"
        />
      </div>

      {/* Status Heading and Description */}
      <div className="space-y-2 mb-6">
        <h3 className="font-display text-lg font-bold text-[#172033] tracking-tight">
          {message}
        </h3>
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
          {submessage}
        </p>
      </div>

      {/* Timeout / Recovery Action */}
      {timedOut && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 w-full text-left space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-xs text-amber-900 font-medium">
            This operation is taking longer than expected.
          </div>
          <div className="flex items-center gap-2">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTimedOut(false);
                  onRetry();
                }}
                className="text-xs gap-1.5 bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
              >
                <RefreshCw className="size-3.5" />
                Retry Request
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (!fullscreen) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAF9F6]/95 backdrop-blur-xs select-none">
      {content}
    </div>
  );
}
