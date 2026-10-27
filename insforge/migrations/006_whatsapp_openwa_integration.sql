-- ==============================================================================
-- 006_whatsapp_openwa_integration.sql
-- InsurCall: WhatsApp Account Connection, Multi-Tenant Inbox & Webhook Routing
-- ==============================================================================

-- 1. WhatsApp Connections Table (OpenWA Sessions, Linked Accounts, QR Status)
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'openwa',
  provider_session_id TEXT,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'NOT_CONNECTED' CHECK (status IN (
    'NOT_CONNECTED',
    'STARTING',
    'QR_READY',
    'AUTHENTICATING',
    'CONNECTED',
    'RECONNECTING',
    'DISCONNECTED',
    'FAILED'
  )),
  qr_code TEXT,
  qr_expires_at TIMESTAMPTZ,
  webhook_id TEXT,
  webhook_secret TEXT,
  auto_reply_enabled BOOLEAN NOT NULL DEFAULT true,
  human_takeover_enabled BOOLEAN NOT NULL DEFAULT false,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, session_name)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_tenant ON whatsapp_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status ON whatsapp_connections(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_prov_id ON whatsapp_connections(provider_session_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'whatsapp_connections_updated_at'
  ) THEN
    CREATE TRIGGER whatsapp_connections_updated_at BEFORE UPDATE ON whatsapp_connections
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- 2. WhatsApp Conversations (Unified Thread Management)
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  chat_id TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'human_takeover', 'resolved', 'archived')),
  human_takeover BOOLEAN NOT NULL DEFAULT false,
  human_takeover_by TEXT,
  human_takeover_at TIMESTAMPTZ,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unread_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_tenant ON whatsapp_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_chat ON whatsapp_conversations(chat_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_recent ON whatsapp_conversations(tenant_id, last_message_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'whatsapp_conversations_updated_at'
  ) THEN
    CREATE TRIGGER whatsapp_conversations_updated_at BEFORE UPDATE ON whatsapp_conversations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- 3. WhatsApp Messages Table (Inbound, Outbound & RAG Citations)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL DEFAULT 'inbound',
  sender_type TEXT NOT NULL DEFAULT 'customer',
  chat_id TEXT,
  phone TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  provider_message_id TEXT,
  idempotency_key TEXT,
  grounded_facts JSONB DEFAULT '[]'::jsonb,
  escalated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist even if table was pre-existing
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES whatsapp_connections(id) ON DELETE CASCADE;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS chat_id TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS sender_type TEXT DEFAULT 'customer';
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS grounded_facts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS escalated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'business_id') THEN
    ALTER TABLE whatsapp_messages ALTER COLUMN business_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'id') THEN
    ALTER TABLE whatsapp_messages ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_messages_conversation_id_fkey') THEN
    ALTER TABLE whatsapp_messages DROP CONSTRAINT whatsapp_messages_conversation_id_fkey;
  END IF;
  ALTER TABLE whatsapp_messages ADD CONSTRAINT whatsapp_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant ON whatsapp_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conv ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat ON whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_dedup ON whatsapp_messages(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_prov ON whatsapp_messages(provider_message_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_whatsapp_messages_tenant_prov') THEN
    ALTER TABLE whatsapp_messages ADD CONSTRAINT uq_whatsapp_messages_tenant_prov UNIQUE (tenant_id, provider_message_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'whatsapp_messages_updated_at'
  ) THEN
    CREATE TRIGGER whatsapp_messages_updated_at BEFORE UPDATE ON whatsapp_messages
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- 4. Row Level Security for WhatsApp Tables
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'whatsapp_connections_tenant_isolation') THEN
    CREATE POLICY whatsapp_connections_tenant_isolation ON whatsapp_connections
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'whatsapp_conversations_tenant_isolation') THEN
    CREATE POLICY whatsapp_conversations_tenant_isolation ON whatsapp_conversations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'whatsapp_messages_tenant_isolation') THEN
    CREATE POLICY whatsapp_messages_tenant_isolation ON whatsapp_messages
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
