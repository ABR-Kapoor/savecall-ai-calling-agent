-- ==============================================================================
-- 008_whatsapp_cloud_calling.sql
-- InsurCall: LiveKit Cloud x WhatsApp Business Calling Data Model Extension
-- Non-destructive, forward-only migration.
-- ==============================================================================

-- 1. Extend call_sessions table for WhatsApp Voice Calling lifecycle
ALTER TABLE call_sessions
  ADD COLUMN IF NOT EXISTS meta_call_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES whatsapp_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'webrtc',
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'inbound',
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'initiated',
  ADD COLUMN IF NOT EXISTS termination_reason TEXT,
  ADD COLUMN IF NOT EXISTS caller_wa_id TEXT,
  ADD COLUMN IF NOT EXISTS business_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS error_category TEXT,
  ADD COLUMN IF NOT EXISTS diagnostic_metadata JSONB DEFAULT '{}'::jsonb;

-- Ensure check constraints exist if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_call_sessions_channel'
  ) THEN
    ALTER TABLE call_sessions
      ADD CONSTRAINT chk_call_sessions_channel
      CHECK (channel IN ('webrtc', 'whatsapp', 'phone'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_call_sessions_direction'
  ) THEN
    ALTER TABLE call_sessions
      ADD CONSTRAINT chk_call_sessions_direction
      CHECK (direction IN ('inbound', 'outbound'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_call_sessions_lifecycle_status'
  ) THEN
    ALTER TABLE call_sessions
      ADD CONSTRAINT chk_call_sessions_lifecycle_status
      CHECK (lifecycle_status IN ('initiated', 'ringing', 'connecting', 'active', 'ended', 'failed', 'rejected', 'cancelled'));
  END IF;
END $$;

-- 2. Extend whatsapp_connections table for Meta Business Calling capabilities
ALTER TABLE whatsapp_connections
  ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS calling_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inbound_calling_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS outbound_calling_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS calling_hours JSONB NOT NULL DEFAULT '{"enabled": false, "start": "09:00", "end": "18:00", "timezone": "Asia/Kolkata"}'::jsonb,
  ADD COLUMN IF NOT EXISTS meta_app_id TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Index for lookup by Meta Phone Number ID
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_meta_phone_id
  ON whatsapp_connections (meta_phone_number_id)
  WHERE meta_phone_number_id IS NOT NULL;

-- 3. Create whatsapp_call_events table for idempotency and audit logs
CREATE TABLE IF NOT EXISTS whatsapp_call_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_session_id UUID REFERENCES call_sessions(id) ON DELETE CASCADE,
  event_key TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  meta_call_id TEXT,
  direction TEXT,
  status TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_call_events_tenant_recent
  ON whatsapp_call_events (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_call_events_meta_call
  ON whatsapp_call_events (meta_call_id)
  WHERE meta_call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_call_events_session
  ON whatsapp_call_events (call_session_id)
  WHERE call_session_id IS NOT NULL;

-- 4. Row Level Security for Tenant Isolation
ALTER TABLE whatsapp_call_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'whatsapp_call_events_tenant_isolation') THEN
    CREATE POLICY whatsapp_call_events_tenant_isolation ON whatsapp_call_events
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  END IF;
END $$;

-- Indexes on call_sessions for performance
CREATE INDEX IF NOT EXISTS idx_call_sessions_meta_call_id
  ON call_sessions (meta_call_id)
  WHERE meta_call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_call_sessions_tenant_channel_recent
  ON call_sessions (tenant_id, channel, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_call_sessions_lifecycle_status
  ON call_sessions (tenant_id, lifecycle_status);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
