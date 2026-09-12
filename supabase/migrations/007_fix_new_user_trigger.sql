-- ============================================================
-- Migration 007: Fix handle_new_user trigger
-- ============================================================
-- Problem: COALESCE((value)::user_role, 'waiter') fails when
-- value is an empty string '' — the cast throws BEFORE COALESCE
-- runs, so new user sign-ups via magic link crash with
-- "Database error saving new user".
--
-- Fix: Use NULLIF to convert empty string to NULL first, then
-- only attempt the enum cast when the value is non-null and
-- actually valid. Default to 'waiter' for all regular sign-ups.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_role      user_role := 'waiter';
  v_role_raw  TEXT;
BEGIN
  -- Safely extract full_name
  v_full_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');

  -- Safely extract role — only cast if it's a known valid value
  v_role_raw := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', '')), '');
  IF v_role_raw IN ('platform_admin','owner','manager','waiter','chef','kitchen_manager','cashier') THEN
    v_role := v_role_raw::user_role;
  END IF;

  INSERT INTO profiles (id, full_name, role, is_active)
  VALUES (NEW.id, v_full_name, v_role, TRUE)
  ON CONFLICT (id) DO NOTHING;  -- idempotent: don't overwrite existing profiles

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-create the trigger (DROP + CREATE to replace cleanly)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
