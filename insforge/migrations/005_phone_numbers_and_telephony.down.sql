-- ==============================================================================
-- 005_phone_numbers_and_telephony.down.sql
-- Rollback for Migration 005
-- ==============================================================================

DROP TABLE IF EXISTS telephony_connections CASCADE;
DROP TABLE IF EXISTS phone_numbers CASCADE;

NOTIFY pgrst, 'reload schema';
