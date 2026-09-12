-- ============================================================
-- Migration 005: Schema Fixes for Provisioning
-- ============================================================

-- Add unique constraint to owners.profile_id
-- Required for ON CONFLICT (profile_id) upsert in provision_owner()
ALTER TABLE owners ADD CONSTRAINT owners_profile_id_unique UNIQUE (profile_id);
