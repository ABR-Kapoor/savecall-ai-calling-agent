import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@clerk/clerk-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SaveCall AI Receptionist" },
      { name: "description", content: "Access your AI receptionist dashboard." },
      { property: "og:title", content: "Sign in — SaveCall" },
      { property: "og:description", content: "Access your AI receptionist dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md flex justify-center">
        <SignIn routing="hash" fallbackRedirectUrl="/dashboard" />
      </div>
    </div>
  );
}
