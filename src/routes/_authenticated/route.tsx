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
        if (!isCancelled) setIsRegistered(true);
      })
      .catch((err) => {
        console.warn("User registration sync notice:", err);
        if (!isCancelled) setIsRegistered(true);
      });

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, user?.id, user?.fullName, user?.primaryEmailAddress?.emailAddress]);

  return <>{children}</>;
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
