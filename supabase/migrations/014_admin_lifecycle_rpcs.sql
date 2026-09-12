-- ============================================================
-- RestPilot Multi-Tenant Restaurant Platform
-- Migration 014: Admin Owner & Restaurant Lifecycle RPCs
-- ============================================================
-- Implements:
--   suspend_owner(p_owner_id)    — set owners.is_active = FALSE
--   activate_owner(p_owner_id)   — set owners.is_active = TRUE
--   suspend_restaurant(p_restaurant_id) — set restaurants.is_active = FALSE
--   activate_restaurant(p_restaurant_id) — set restaurants.is_active = TRUE
--   disable_staff_member(p_staff_id) — set staff_members.is_active = FALSE
--   enable_staff_member(p_staff_id)  — set staff_members.is_active = TRUE
-- All functions:
--   - Verify caller via auth.uid() = platform_admin
--   - Write to admin_audit_log
--   - Use SECURITY DEFINER to bypass protect_* triggers
-- ============================================================

-- ============================================================
-- 1. SUSPEND OWNER
-- ============================================================

CREATE OR REPLACE FUNCTION suspend_owner(p_owner_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_old       JSONB;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized: platform_admin only';
  END IF;

  -- Capture old state for audit
  SELECT to_jsonb(o) INTO v_old FROM owners o WHERE id = p_owner_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Owner not found'; END IF;

  -- Suspend the owner
  UPDATE owners SET is_active = FALSE WHERE id = p_owner_id;

  -- Also deactivate all their restaurants
  UPDATE restaurants SET is_active = FALSE
  WHERE owner_id = p_owner_id;

  -- Audit log
  PERFORM log_admin_action(
    v_caller_id, 'suspend_owner', 'owner', p_owner_id,
    v_old,
    jsonb_build_object('is_active', FALSE),
    jsonb_build_object('note', 'All associated restaurants also suspended')
  );

  RETURN jsonb_build_object('success', TRUE, 'owner_id', p_owner_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. ACTIVATE OWNER
-- ============================================================

CREATE OR REPLACE FUNCTION activate_owner(p_owner_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_old       JSONB;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized: platform_admin only';
  END IF;

  SELECT to_jsonb(o) INTO v_old FROM owners o WHERE id = p_owner_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Owner not found'; END IF;

  UPDATE owners SET is_active = TRUE WHERE id = p_owner_id;

  -- Also re-activate the owner's profile
  UPDATE profiles SET is_active = TRUE
  WHERE id = (SELECT profile_id FROM owners WHERE id = p_owner_id);

  PERFORM log_admin_action(
    v_caller_id, 'activate_owner', 'owner', p_owner_id,
    v_old,
    jsonb_build_object('is_active', TRUE)
  );

  RETURN jsonb_build_object('success', TRUE, 'owner_id', p_owner_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. SUSPEND RESTAURANT
-- ============================================================

CREATE OR REPLACE FUNCTION suspend_restaurant(p_restaurant_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_old       JSONB;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized: platform_admin only';
  END IF;

  SELECT to_jsonb(r) INTO v_old FROM restaurants r WHERE id = p_restaurant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Restaurant not found'; END IF;

  UPDATE restaurants
  SET is_active = FALSE, is_accepting_orders = FALSE
  WHERE id = p_restaurant_id;

  PERFORM log_admin_action(
    v_caller_id, 'suspend_restaurant', 'restaurant', p_restaurant_id,
    v_old,
    jsonb_build_object('is_active', FALSE, 'is_accepting_orders', FALSE)
  );

  RETURN jsonb_build_object('success', TRUE, 'restaurant_id', p_restaurant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. ACTIVATE RESTAURANT
-- ============================================================

CREATE OR REPLACE FUNCTION activate_restaurant(p_restaurant_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_old       JSONB;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized: platform_admin only';
  END IF;

  SELECT to_jsonb(r) INTO v_old FROM restaurants r WHERE id = p_restaurant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Restaurant not found'; END IF;

  UPDATE restaurants
  SET is_active = TRUE, is_accepting_orders = TRUE
  WHERE id = p_restaurant_id;

  PERFORM log_admin_action(
    v_caller_id, 'activate_restaurant', 'restaurant', p_restaurant_id,
    v_old,
    jsonb_build_object('is_active', TRUE, 'is_accepting_orders', TRUE)
  );

  RETURN jsonb_build_object('success', TRUE, 'restaurant_id', p_restaurant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. DISABLE STAFF MEMBER (admin override)
-- ============================================================

CREATE OR REPLACE FUNCTION disable_staff_member(p_staff_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_old       JSONB;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized: platform_admin only';
  END IF;

  SELECT to_jsonb(s) INTO v_old FROM staff_members s WHERE id = p_staff_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff member not found'; END IF;

  UPDATE staff_members SET is_active = FALSE WHERE id = p_staff_id;

  PERFORM log_admin_action(
    v_caller_id, 'disable_staff', 'staff_member', p_staff_id,
    v_old,
    jsonb_build_object('is_active', FALSE)
  );

  RETURN jsonb_build_object('success', TRUE, 'staff_id', p_staff_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 6. ENABLE STAFF MEMBER (admin override)
-- ============================================================

CREATE OR REPLACE FUNCTION enable_staff_member(p_staff_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_old       JSONB;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized: platform_admin only';
  END IF;

  SELECT to_jsonb(s) INTO v_old FROM staff_members s WHERE id = p_staff_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff member not found'; END IF;

  UPDATE staff_members SET is_active = TRUE WHERE id = p_staff_id;

  PERFORM log_admin_action(
    v_caller_id, 'enable_staff', 'staff_member', p_staff_id,
    v_old,
    jsonb_build_object('is_active', TRUE)
  );

  RETURN jsonb_build_object('success', TRUE, 'staff_id', p_staff_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 7. GRANTS
-- ============================================================

GRANT EXECUTE ON FUNCTION suspend_owner        TO authenticated;
GRANT EXECUTE ON FUNCTION activate_owner       TO authenticated;
GRANT EXECUTE ON FUNCTION suspend_restaurant   TO authenticated;
GRANT EXECUTE ON FUNCTION activate_restaurant  TO authenticated;
GRANT EXECUTE ON FUNCTION disable_staff_member TO authenticated;
GRANT EXECUTE ON FUNCTION enable_staff_member  TO authenticated;
