-- ==============================================================================
-- 002_rag_security_schema.sql
-- InsurCall: Secure Multi-Tenant, Agent-Isolated Vector RAG & Knowledge Storage
-- ==============================================================================

-- 1. Ensure pgvector is active
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add RAG & Governance Columns to knowledge_sources if not present
ALTER TABLE knowledge_sources 
  ADD COLUMN IF NOT EXISTS approved_for_rag BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS privacy_mode TEXT NOT NULL DEFAULT 'local_only' CHECK (privacy_mode IN ('local_only', 'external_allowed')),
  ADD COLUMN IF NOT EXISTS provenance JSONB DEFAULT '{}'::jsonb;

-- 3. Explicit Agent-to-Knowledge-Source Mapping (Agent Isolation)
CREATE TABLE IF NOT EXISTS agent_knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_sources_tenant ON agent_knowledge_sources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_sources_agent ON agent_knowledge_sources(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sources_source ON agent_knowledge_sources(source_id);

-- 4. Document Chunks Table with Vector Embeddings (384-dim for local embeddings)
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  page_number INTEGER,
  sheet_name TEXT,
  section_heading TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_hash TEXT,
  embedding vector(384),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant ON document_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_source ON document_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_hash ON document_chunks(content_hash);

-- HNSW Vector index for fast, high-recall vector cosine search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
ON document_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. Strict Tenant + Agent Isolated Retrieval Function
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

-- 6. Enable Row Level Security on all Knowledge Tables
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

-- 7. Policy Definitions using verified Clerk identity in request JWT claims
-- (Falls back safely to service-role if authenticated server context)

-- knowledge_sources policy
DROP POLICY IF EXISTS rls_knowledge_sources_tenant ON knowledge_sources;
CREATE POLICY rls_knowledge_sources_tenant ON knowledge_sources
FOR ALL
USING (
  tenant_id IN (
    SELECT tm.tenant_id FROM tenant_members tm
    WHERE tm.clerk_user_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'sub',
      current_setting('app.current_clerk_user_id', true)
    )
    AND tm.status = 'active'
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tm.tenant_id FROM tenant_members tm
    WHERE tm.clerk_user_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'sub',
      current_setting('app.current_clerk_user_id', true)
    )
    AND tm.status = 'active'
  )
);

-- agent_knowledge_sources policy
DROP POLICY IF EXISTS rls_agent_sources_tenant ON agent_knowledge_sources;
CREATE POLICY rls_agent_sources_tenant ON agent_knowledge_sources
FOR ALL
USING (
  tenant_id IN (
    SELECT tm.tenant_id FROM tenant_members tm
    WHERE tm.clerk_user_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'sub',
      current_setting('app.current_clerk_user_id', true)
    )
    AND tm.status = 'active'
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tm.tenant_id FROM tenant_members tm
    WHERE tm.clerk_user_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'sub',
      current_setting('app.current_clerk_user_id', true)
    )
    AND tm.status = 'active'
  )
);

-- document_chunks policy
DROP POLICY IF EXISTS rls_document_chunks_tenant ON document_chunks;
CREATE POLICY rls_document_chunks_tenant ON document_chunks
FOR ALL
USING (
  tenant_id IN (
    SELECT tm.tenant_id FROM tenant_members tm
    WHERE tm.clerk_user_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'sub',
      current_setting('app.current_clerk_user_id', true)
    )
    AND tm.status = 'active'
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tm.tenant_id FROM tenant_members tm
    WHERE tm.clerk_user_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'sub',
      current_setting('app.current_clerk_user_id', true)
    )
    AND tm.status = 'active'
  )
);
