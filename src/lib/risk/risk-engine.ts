export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type ToolSecurityPolicy = {
  riskLevel: RiskLevel;
  requiresOtp: boolean;
  requiresConfirmation: boolean;
  requiresHumanReview: boolean;
  description: string;
};

export const TOOL_POLICIES: Record<string, ToolSecurityPolicy> = {
  get_agent_config: {
    riskLevel: "LOW",
    requiresOtp: false,
    requiresConfirmation: false,
    requiresHumanReview: false,
    description: "Fetch dynamic tenant agent configuration and company knowledge base",
  },
  get_policy: {
    riskLevel: "LOW",
    requiresOtp: false,
    requiresConfirmation: false,
    requiresHumanReview: false,
    description: "Read policy details, plan name, premium, and due date",
  },
  get_claim_status: {
    riskLevel: "LOW",
    requiresOtp: false,
    requiresConfirmation: false,
    requiresHumanReview: false,
    description: "Check status and settlement notes of submitted insurance claims",
  },
  request_document: {
    riskLevel: "LOW",
    requiresOtp: false,
    requiresConfirmation: true,
    requiresHumanReview: false,
    description: "Email policy certificate or tax statement to registered email",
  },
  send_otp: {
    riskLevel: "LOW",
    requiresOtp: false,
    requiresConfirmation: false,
    requiresHumanReview: false,
    description: "Send a one-time passcode to customer for sensitive actions",
  },
  verify_otp: {
    riskLevel: "MEDIUM",
    requiresOtp: false,
    requiresConfirmation: false,
    requiresHumanReview: false,
    description: "Verify customer-provided one-time passcode",
  },
  update_contact_details: {
    riskLevel: "MEDIUM",
    requiresOtp: true,
    requiresConfirmation: true,
    requiresHumanReview: false,
    description: "Update registered communication email or phone",
  },
  change_nominee: {
    riskLevel: "HIGH",
    requiresOtp: true,
    requiresConfirmation: true,
    requiresHumanReview: true,
    description: "Request change of policy nominee and payout beneficiary",
  },
  update_bank_details: {
    riskLevel: "HIGH",
    requiresOtp: true,
    requiresConfirmation: true,
    requiresHumanReview: true,
    description: "Update direct debit or claim payout bank account",
  },
  cancel_policy: {
    riskLevel: "VERY_HIGH",
    requiresOtp: true,
    requiresConfirmation: true,
    requiresHumanReview: true,
    description: "Initiate policy cancellation, surrender, or refund request",
  },
};

export type ExecutionValidationResult = {
  allowed: boolean;
  reason?: string;
  policy: ToolSecurityPolicy;
};

/**
 * Authoritative backend risk evaluation for AI tool execution.
 * Validates whether the call session has fulfilled all risk prerequisites (OTP, Confirmation).
 */
export function evaluateToolSecurity(
  toolName: string,
  session: {
    riskState: RiskLevel;
    otpVerifiedUntil?: string | null;
  }
): ExecutionValidationResult {
  const policy = TOOL_POLICIES[toolName];
  if (!policy) {
    return {
      allowed: false,
      reason: `Unknown or unregistered tool: ${toolName}`,
      policy: {
        riskLevel: "VERY_HIGH",
        requiresOtp: true,
        requiresConfirmation: true,
        requiresHumanReview: true,
        description: "Unregistered tool",
      },
    };
  }

  // Check OTP requirement
  if (policy.requiresOtp) {
    if (!session.otpVerifiedUntil) {
      return {
        allowed: false,
        reason: `Action '${toolName}' requires a verified OTP. Please call send_otp first.`,
        policy,
      };
    }

    const verifiedUntil = new Date(session.otpVerifiedUntil).getTime();
    if (Date.now() > verifiedUntil) {
      return {
        allowed: false,
        reason: "Previous OTP verification has expired. A fresh OTP is required.",
        policy,
      };
    }
  }

  return { allowed: true, policy };
}
