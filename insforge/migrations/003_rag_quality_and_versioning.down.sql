-- ==============================================================================
-- 003_rag_quality_and_versioning.down.sql
-- Rollback for semantic embedding model versioning
-- ==============================================================================

-- 1. Restore previous match_document_chunks function without model version parameter
CREATE OR REPLACE FUNCTION match_document_chunks(
  p_tenant_id UUID,
  p_agent_id UUID,
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  source_id UUID,
  source_name VARCHAR,
  source_type VARCHAR,
  content TEXT,
  page_number INT,
  sheet_name TEXT,
  section_heading TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.source_id,
    ks.name AS source_name,
    ks.type AS source_type,
    dc.content,
    dc.page_number,
    dc.sheet_name,
    dc.section_heading,
    dc.metadata,
    (1 - (dc.embedding <=> query_embedding))::FLOAT AS similarity
  FROM document_chunks dc
  JOIN knowledge_sources ks ON ks.id = dc.source_id
  JOIN agent_knowledge_sources aks ON aks.source_id = ks.id AND aks.agent_id = p_agent_id
  WHERE dc.tenant_id = p_tenant_id
    AND ks.tenant_id = p_tenant_id
    AND aks.tenant_id = p_tenant_id
    AND ks.status = 'done'
    AND ks.approved_for_rag = true
    AND (1 - (dc.embedding <=> query_embedding)) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 2. Drop index and column
DROP INDEX IF EXISTS idx_document_chunks_model;
ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding_model;

NOTIFY pgrst, 'reload schema';
