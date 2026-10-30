import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RedirectToSignIn, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { registerClerkUser } from "@/lib/insurance.functions";
import { InsurCallLoadingScreen } from "@/components/loading-screen";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function UserRegistrationSync({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    let isCancelled = false;

    registerClerkUser({
      data: {
        clerkUserId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName || undefined,
        phone: user.primaryPhoneNumber?.phoneNumber || undefined,
      },
    })
      .then(() => {
        if (!isCancelled) {
          setRegistrationError(null);
          setIsRegistered(true);
        }
      })
      .catch((err) => {
        console.warn("User registration sync notice:", err);
        if (!isCancelled) {
          setRegistrationError(err instanceof Error ? err.message : "Could not set up your organisation.");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, user?.id, user?.fullName, user?.primaryEmailAddress?.emailAddress, retryCount]);

  if (!isRegistered && !registrationError) {
    return <InsurCallLoadingScreen message="Securing tenant boundary & RLS isolation..." />;
  }

  if (registrationError) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-6 shadow-sm space-y-4">
          <div className="size-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <span className="text-xl font-bold">!</span>
          </div>
          <h2 className="text-lg font-bold text-[#111827]">Organisation Setup Required</h2>
          <p className="text-xs text-[#667085] leading-relaxed">
            {registrationError}
          </p>
          <button
            onClick={() => setRetryCount((count) => count + 1)}
            className="w-full py-2.5 rounded-xl bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AuthenticatedLayout() {
  const { isLoaded, isSignedIn, user } = useUser();

  // 1. Initial authentication loading state
  if (!isLoaded) {
    return <InsurCallLoadingScreen message="Verifying secure access & tenant authorization..." />;
  }

  // 2. Strict authentication guard before any access to protected routes
  if (!isSignedIn || !user) {
    const returnUrl = typeof window !== "undefined" ? window.location.pathname : "/dashboard";
    return <RedirectToSignIn signInFallbackRedirectUrl={returnUrl} />;
  }

  // 3. User & Tenant registration / RLS sync barrier
  return (
    <UserRegistrationSync>
      <Outlet />
    </UserRegistrationSync>
  );
}
