-- ==============================================================================
-- 004_voice_agent_rag_integration.sql
-- InsurCall: Production Voice Agent & RAG Observability Integration
-- ==============================================================================

-- 1. Add agent association and escalation status to call_sessions
ALTER TABLE call_sessions 
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS escalated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
  ADD COLUMN IF NOT EXISTS caller_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_call_sessions_agent ON call_sessions(agent_id);

-- 2. Ensure RLS policies are active on call_sessions
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'call_sessions_tenant_isolation') THEN
    CREATE POLICY call_sessions_tenant_isolation ON call_sessions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
