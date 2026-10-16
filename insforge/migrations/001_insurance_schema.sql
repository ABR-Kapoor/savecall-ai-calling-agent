-- ==============================================================================
-- SaveCall: Clean-Slate Multi-Tenant Insurance Schema (InsForge PostgreSQL)
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Helper trigger function for updated_at
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 2. Tenants (Insurance Companies)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
  branding_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 3. Tenant Members (Clerk user associations to Insurance Companies)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('owner', 'admin', 'agent', 'compliance', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, clerk_user_id)
);

CREATE INDEX idx_tenant_members_clerk ON tenant_members(clerk_user_id);
CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id);

-- ------------------------------------------------------------------------------
-- 4. Customers (Policyholders)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clerk_user_id TEXT,
  customer_number TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'flagged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, customer_number)
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_clerk ON customers(clerk_user_id);
CREATE INDEX idx_customers_email ON customers(tenant_id, email);
CREATE INDEX idx_customers_phone ON customers(tenant_id, phone);

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 5. Policies
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  policy_number TEXT NOT NULL,
  policy_type TEXT NOT NULL DEFAULT 'health' CHECK (policy_type IN ('health', 'life', 'motor', 'property', 'travel')),
  plan_name TEXT NOT NULL,
  nominee_name TEXT,
  nominee_relationship TEXT,
  premium_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'grace_period', 'lapsed', 'surrendered', 'cancelled')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, policy_number)
);

CREATE INDEX idx_policies_tenant ON policies(tenant_id);
CREATE INDEX idx_policies_customer ON policies(customer_id);
CREATE INDEX idx_policies_number ON policies(tenant_id, policy_number);

CREATE TRIGGER policies_updated_at BEFORE UPDATE ON policies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 6. Claims
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'investigation', 'approved', 'rejected', 'settled')),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  description TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, claim_number)
);

CREATE INDEX idx_claims_tenant ON claims(tenant_id);
CREATE INDEX idx_claims_customer ON claims(customer_id);
CREATE INDEX idx_claims_policy ON claims(policy_id);

CREATE TRIGGER claims_updated_at BEFORE UPDATE ON claims
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 7. Call Sessions (LiveKit Voice Sessions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  clerk_session_id TEXT,
  livekit_room_name TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'disconnected', 'failed')),
  risk_state TEXT NOT NULL DEFAULT 'LOW' CHECK (risk_state IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
  otp_verified_until TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  summary TEXT
);

CREATE INDEX idx_call_sessions_tenant ON call_sessions(tenant_id);
CREATE INDEX idx_call_sessions_customer ON call_sessions(customer_id);
CREATE INDEX idx_call_sessions_room ON call_sessions(livekit_room_name);

-- ------------------------------------------------------------------------------
-- 8. Messages (Transcripts per voice turn)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT,
  tool_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_session ON messages(call_session_id);

-- ------------------------------------------------------------------------------
-- 9. OTP Challenges
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('update_contact_details', 'change_nominee', 'update_bank_details', 'cancel_policy')),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  destination_masked TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  verified_at TIMESTAMPTZ,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_session ON otp_challenges(call_session_id);
CREATE INDEX idx_otp_customer ON otp_challenges(customer_id);

-- ------------------------------------------------------------------------------
-- 10. Policy Change Requests (Staging table for High/Very High risk actions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS policy_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('nominee_change', 'bank_change', 'address_change', 'cancellation')),
  requested_payload JSONB NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('MEDIUM', 'HIGH', 'VERY_HIGH')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  requested_by_session UUID REFERENCES call_sessions(id) ON DELETE SET NULL,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_change_requests_tenant ON policy_change_requests(tenant_id);
CREATE INDEX idx_change_requests_customer ON policy_change_requests(customer_id);
CREATE INDEX idx_change_requests_status ON policy_change_requests(tenant_id, status);

CREATE TRIGGER policy_change_requests_updated_at BEFORE UPDATE ON policy_change_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 11. Audit Logs (Immutable Security Trail)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  call_session_id UUID REFERENCES call_sessions(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('customer', 'ai_agent', 'staff_user', 'system')),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
  status TEXT NOT NULL CHECK (status IN ('success', 'denied', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_customer ON audit_logs(customer_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 12. Tool Executions (Sanitized AI Tool Audit)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  arguments JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_status TEXT NOT NULL CHECK (result_status IN ('success', 'error', 'denied')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tool_executions_session ON tool_executions(call_session_id);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current authenticated user belongs to tenant
CREATE OR REPLACE FUNCTION is_member_of_tenant(_tenant_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_id = _tenant_id
      AND clerk_user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub'
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function to check if current authenticated user is customer
CREATE OR REPLACE FUNCTION is_customer(_customer_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM customers
    WHERE id = _customer_id
      AND clerk_user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub'
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Policies for Policies Table
CREATE POLICY "Tenant staff read policies" ON policies
FOR SELECT USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Customer self read policies" ON policies
FOR SELECT USING (is_customer(customer_id));

-- Policies for Claims Table
CREATE POLICY "Tenant staff read claims" ON claims
FOR SELECT USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Customer self read claims" ON claims
FOR SELECT USING (is_customer(customer_id));

-- Policies for Policy Change Requests
CREATE POLICY "Tenant staff view change requests" ON policy_change_requests
FOR SELECT USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Tenant staff update change requests" ON policy_change_requests
FOR UPDATE USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Customer view own change requests" ON policy_change_requests
FOR SELECT USING (is_customer(customer_id));

-- Immutable Audit Logs: Staff read only, insert via system
CREATE POLICY "Tenant staff view audit logs" ON audit_logs
FOR SELECT USING (is_member_of_tenant(tenant_id));

-- ==============================================================================
-- Initial Demo Seed Data
-- ==============================================================================
INSERT INTO tenants (id, name, slug, status, branding_config)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'SafeLife Insurance Co.',
  'safelife',
  'active',
  '{"primaryColor": "#0284c7", "supportPhone": "+91 80000 12345"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, tenant_id, customer_number, name, email, phone, status)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'CUST-883921',
  'Aarav Sharma',
  'aarav.sharma@example.com',
  '+91 98765 43210',
  'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO policies (id, tenant_id, customer_id, policy_number, policy_type, plan_name, nominee_name, nominee_relationship, premium_amount, due_date, status)
VALUES (
  'p0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'POL-HLT-9921',
  'health',
  'Family Health Shield Platinum',
  'Priya Sharma',
  'Spouse',
  14500.00,
  CURRENT_DATE + INTERVAL '25 days',
  'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO claims (id, tenant_id, customer_id, policy_id, claim_number, status, amount, description)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'p0000000-0000-0000-0000-000000000001',
  'CLM-2026-0042',
  'in_review',
  28400.00,
  'Hospitalization cashless pre-authorization for minor daycare surgery'
) ON CONFLICT (id) DO NOTHING;
