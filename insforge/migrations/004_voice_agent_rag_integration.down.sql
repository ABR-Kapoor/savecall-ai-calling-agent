-- ==============================================================================
-- 004_voice_agent_rag_integration.down.sql
-- Rollback for voice agent RAG integration
-- ==============================================================================

DROP POLICY IF EXISTS call_sessions_tenant_isolation ON call_sessions;
DROP INDEX IF EXISTS idx_call_sessions_agent;

ALTER TABLE call_sessions
  DROP COLUMN IF EXISTS agent_id,
  DROP COLUMN IF EXISTS escalated,
  DROP COLUMN IF EXISTS escalation_reason,
  DROP COLUMN IF EXISTS caller_notes;

NOTIFY pgrst, 'reload schema';
