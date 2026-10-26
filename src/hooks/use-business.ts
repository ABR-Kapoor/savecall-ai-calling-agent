import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { getTenantSettings } from "@/lib/insurance.functions";

export type Business = {
  id: string;
  name: string;
  slug: string;
  status: string;
  branding_config?: {
    primary_color?: string;
    support_phone?: string;
    support_email?: string;
    onboarding_step?: number;
    onboarding_completed?: boolean;
    organization_details?: Record<string, unknown>;
    agent_config?: Record<string, unknown>;
  };
};

export function useBusiness() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["my-tenant", user?.id],
    queryFn: async (): Promise<Business | null> => {
      const tenant = await getTenantSettings({
        data: {
          clerkUserId: user?.id,
          userEmail: user?.primaryEmailAddress?.emailAddress,
          userName: user?.fullName || undefined,
        },
      });
      return (tenant as Business) ?? null;
    },
  });
}

export function money(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
