import { useQuery } from "@tanstack/react-query";
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
  };
};

export function useBusiness() {
  return useQuery({
    queryKey: ["my-tenant"],
    queryFn: async (): Promise<Business | null> => {
      const tenant = await getTenantSettings();
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
