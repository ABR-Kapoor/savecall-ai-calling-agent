export type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "trial";
  branding_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type TenantMember = {
  id: string;
  tenant_id: string;
  clerk_user_id: string;
  role: "owner" | "admin" | "agent" | "compliance" | "viewer";
  status: "active" | "inactive" | "invited";
  created_at: string;
};

export type Customer = {
  id: string;
  tenant_id: string;
  clerk_user_id: string | null;
  customer_number: string;
  name: string;
  email: string;
  phone: string | null;
  status: "active" | "inactive" | "flagged";
  created_at: string;
  updated_at: string;
};

export type Policy = {
  id: string;
  tenant_id: string;
  customer_id: string;
  policy_number: string;
  policy_type: "health" | "life" | "motor" | "property" | "travel";
  plan_name: string;
  nominee_name?: string | null;
  nominee_relationship?: string | null;
  premium_amount: number;
  due_date?: string | null;
  status: "active" | "grace_period" | "lapsed" | "surrendered" | "cancelled";
  start_date: string;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
};

export type Claim = {
  id: string;
  tenant_id: string;
  customer_id: string;
  policy_id: string;
  claim_number: string;
  status: "submitted" | "in_review" | "investigation" | "approved" | "rejected" | "settled";
  amount: number;
  description?: string | null;
  submitted_at: string;
  updated_at: string;
};

export type CallSession = {
  id: string;
  tenant_id: string;
  customer_id: string;
  clerk_session_id?: string | null;
  livekit_room_name: string;
  status: "active" | "completed" | "disconnected" | "failed";
  risk_state: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  otp_verified_until?: string | null;
  started_at: string;
  ended_at?: string | null;
  summary?: string | null;
};

export type Message = {
  id: string;
  call_session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content?: string | null;
  tool_name?: string | null;
  created_at: string;
};

export type OtpChallenge = {
  id: string;
  call_session_id: string;
  customer_id: string;
  purpose: "update_contact_details" | "change_nominee" | "update_bank_details" | "cancel_policy";
  channel: "email" | "sms";
  destination_masked: string;
  otp_hash: string;
  expires_at: string;
  attempt_count: number;
  max_attempts: number;
  verified_at?: string | null;
  used: boolean;
  created_at: string;
};

export type PolicyChangeRequest = {
  id: string;
  tenant_id: string;
  customer_id: string;
  policy_id?: string | null;
  change_type: "nominee_change" | "bank_change" | "address_change" | "cancellation";
  requested_payload: Record<string, unknown>;
  risk_level: "MEDIUM" | "HIGH" | "VERY_HIGH";
  status: "pending" | "approved" | "rejected" | "expired" | "cancelled";
  requested_by_session?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  tenant_id: string;
  customer_id?: string | null;
  call_session_id?: string | null;
  actor_type: "customer" | "ai_agent" | "staff_user" | "system";
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  status: "success" | "denied" | "failed";
  metadata: Record<string, unknown>;
  created_at: string;
};
