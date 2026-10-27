-- Incremental WhatsApp integrity/performance migration. Safe to re-run.
-- Unique indexes are installed only when existing data satisfies uniqueness;
-- duplicate legacy values are retained and reported for an explicit cleanup.

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_recent
  ON whatsapp_messages (tenant_id, conversation_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_provider_session_lookup
  ON whatsapp_connections (provider_session_id)
  WHERE provider_session_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM whatsapp_connections
    WHERE provider_session_id IS NOT NULL
    GROUP BY provider_session_id HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_connections_provider_session
      ON whatsapp_connections (provider_session_id)
      WHERE provider_session_id IS NOT NULL;
  ELSE
    RAISE NOTICE 'Skipped provider session uniqueness: duplicate legacy session IDs exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM whatsapp_messages
    WHERE connection_id IS NOT NULL AND idempotency_key IS NOT NULL
    GROUP BY connection_id, idempotency_key HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_messages_connection_idempotency
      ON whatsapp_messages (connection_id, idempotency_key)
      WHERE connection_id IS NOT NULL AND idempotency_key IS NOT NULL;
  ELSE
    RAISE NOTICE 'Skipped message deduplication uniqueness: duplicate legacy keys exist';
  END IF;
END $$;
