-- ==============================================================================
-- 002_rag_security_schema.down.sql (Rollback Guidance)
-- ==============================================================================

-- 1. Drop RLS policies
DROP POLICY IF EXISTS rls_document_chunks_tenant ON document_chunks;
DROP POLICY IF EXISTS rls_agent_sources_tenant ON agent_knowledge_sources;
DROP POLICY IF EXISTS rls_knowledge_sources_tenant ON knowledge_sources;

-- 2. Drop match function
DROP FUNCTION IF EXISTS match_document_chunks(UUID, UUID, vector, FLOAT, INT);

-- 3. Drop tables
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS agent_knowledge_sources CASCADE;

-- 4. Revert columns on knowledge_sources
ALTER TABLE knowledge_sources 
  DROP COLUMN IF EXISTS approved_for_rag,
  DROP COLUMN IF EXISTS content_hash,
  DROP COLUMN IF EXISTS privacy_mode,
  DROP COLUMN IF EXISTS provenance;
