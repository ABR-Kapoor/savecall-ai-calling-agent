import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { registerClerkUser } from "@/lib/insurance.functions";

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

  return <>
    {children}
    {registrationError && (
      <div role="alert" className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-xl items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg">
        <span>Account setup failed: {registrationError}</span>
        <button className="shrink-0 font-semibold underline underline-offset-2" onClick={() => setRetryCount((count) => count + 1)}>
          Retry setup
        </button>
      </div>
    )}
  </>;
}

function AuthenticatedLayout() {
  return (
    <>
      <SignedIn>
        <UserRegistrationSync>
          <Outlet />
        </UserRegistrationSync>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn signInFallbackRedirectUrl="/dashboard" />
      </SignedOut>
    </>
  );
}
