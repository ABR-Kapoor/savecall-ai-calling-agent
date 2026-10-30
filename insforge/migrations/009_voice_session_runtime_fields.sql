-- Runtime fields required by the LiveKit voice session API and agent.
-- Safe for existing installations; the canonical room name is copied forward.

ALTER TABLE call_sessions
  ADD COLUMN IF NOT EXISTS room_name TEXT,
  ADD COLUMN IF NOT EXISTS caller_name TEXT,
  ADD COLUMN IF NOT EXISTS caller_phone TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE call_sessions
SET room_name = livekit_room_name
WHERE room_name IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_call_sessions_room_name_unique
  ON call_sessions (room_name)
  WHERE room_name IS NOT NULL;

NOTIFY pgrst, 'reload schema';
