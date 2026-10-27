-- ==============================================================================
-- 005_phone_numbers_and_telephony.sql
-- InsurCall: Phone-Number Onboarding, Telephony Connections & Multi-Tenant Routing
-- ==============================================================================

-- 1. Phone Numbers Table (Forwarding, SIP Trunks, Hosted Numbers, Porting)
CREATE TABLE IF NOT EXISTS phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  display_number TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'IN',
  connection_type TEXT NOT NULL CHECK (connection_type IN ('forwarding', 'sip_trunk', 'hosted_number', 'porting')),
  provider TEXT NOT NULL DEFAULT 'generic',
  status TEXT NOT NULL DEFAULT 'SETUP_PENDING' CHECK (status IN (
    'NOT_CONFIGURED',
    'SETUP_PENDING',
    'VERIFICATION_PENDING',
    'CONFIGURED',
    'TESTING',
    'ACTIVE',
    'FAILED',
    'DISCONNECTED',
    'SUSPENDED'
  )),
  inbound_enabled BOOLEAN NOT NULL DEFAULT true,
  outbound_enabled BOOLEAN NOT NULL DEFAULT false,
  forwarding_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  sip_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ,
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_phone_numbers_tenant ON phone_numbers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_number ON phone_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_agent ON phone_numbers(agent_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_status ON phone_numbers(tenant_id, status);

CREATE TRIGGER phone_numbers_updated_at BEFORE UPDATE ON phone_numbers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Telephony Provider Connections (SIP Trunks, Carrier DIDs, Webhooks)
CREATE TABLE IF NOT EXISTS telephony_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  provider_connection_id TEXT,
  webhook_secret TEXT,
  health_status TEXT NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'offline')),
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telephony_connections_tenant ON telephony_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_telephony_connections_number ON telephony_connections(phone_number_id);

CREATE TRIGGER telephony_connections_updated_at BEFORE UPDATE ON telephony_connections
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Row Level Security for Tenant Isolation
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE telephony_connections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'phone_numbers_tenant_isolation') THEN
    CREATE POLICY phone_numbers_tenant_isolation ON phone_numbers
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'telephony_connections_tenant_isolation') THEN
    CREATE POLICY telephony_connections_tenant_isolation ON telephony_connections
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
