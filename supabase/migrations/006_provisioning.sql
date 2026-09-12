-- ============================================================
-- Migration 006: Provisioning & Staff Permission Functions
-- ============================================================

-- ============================================================
-- PROVISION RESTAURANT OWNER
-- Called by platform_admin to create a new owner + restaurant
-- Uses service role — run from admin API route
-- ============================================================

CREATE OR REPLACE FUNCTION provision_owner(
  p_admin_id        UUID,        -- must be platform_admin
  p_owner_email     TEXT,
  p_owner_name      TEXT,
  p_owner_phone     TEXT,
  p_business_name   TEXT,
  p_plan            subscription_plan DEFAULT 'free',
  p_max_restaurants INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_admin_role  user_role;
  v_profile_id  UUID;
  v_owner_id    UUID;
BEGIN
  -- Verify caller is platform_admin
  SELECT role INTO v_admin_role FROM profiles WHERE id = p_admin_id;
  IF v_admin_role IS DISTINCT FROM 'platform_admin' THEN
    RAISE EXCEPTION 'Unauthorized: caller is not platform_admin';
  END IF;

  -- Check if a profile with this email already exists via auth.users
  SELECT au.id INTO v_profile_id
  FROM auth.users au
  WHERE au.email = p_owner_email
  LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    -- Profile exists — upsert their role to 'owner'
    UPDATE profiles
    SET role = 'owner', full_name = COALESCE(p_owner_name, full_name), is_active = TRUE
    WHERE id = v_profile_id;
  ELSE
    -- No auth user yet — return a pending signal; the admin UI will use
    -- Supabase Admin API (service role) to invite the user then call this again.
    RETURN jsonb_build_object(
      'status', 'invite_required',
      'email', p_owner_email,
      'message', 'No auth user found for this email. Send an invite first.'
    );
  END IF;

  -- Upsert owners record
  INSERT INTO owners (profile_id, business_name, email, phone, subscription_plan, subscription_status, max_restaurants, is_active)
  VALUES (v_profile_id, p_business_name, p_owner_email, p_owner_phone, p_plan, 'trial', p_max_restaurants, TRUE)
  ON CONFLICT (profile_id) DO UPDATE
    SET business_name = EXCLUDED.business_name,
        subscription_plan = EXCLUDED.subscription_plan,
        max_restaurants = EXCLUDED.max_restaurants,
        is_active = TRUE
  RETURNING id INTO v_owner_id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'profile_id', v_profile_id,
    'owner_id', v_owner_id,
    'email', p_owner_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PROVISION RESTAURANT
-- Creates restaurant + default branch + default settings
-- ============================================================

CREATE OR REPLACE FUNCTION provision_restaurant(
  p_owner_id    UUID,
  p_name        TEXT,
  p_slug        TEXT,
  p_city        TEXT DEFAULT NULL,
  p_phone       TEXT DEFAULT NULL,
  p_email       TEXT DEFAULT NULL,
  p_currency    TEXT DEFAULT 'INR',
  p_currency_symbol TEXT DEFAULT '₹',
  p_actor_id    UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_restaurant_id UUID;
  v_branch_id     UUID;
  v_actor_role    user_role;
  v_owner_profile UUID;
BEGIN
  -- Verify actor is owner of this owner record or platform_admin
  IF p_actor_id IS NOT NULL THEN
    SELECT role INTO v_actor_role FROM profiles WHERE id = p_actor_id;
    IF v_actor_role NOT IN ('platform_admin', 'owner') THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  END IF;

  -- Create restaurant
  INSERT INTO restaurants (owner_id, name, slug, city, phone, email, currency, currency_symbol, is_active, is_accepting_orders)
  VALUES (p_owner_id, p_name, p_slug, p_city, p_phone, p_email, p_currency, p_currency_symbol, TRUE, TRUE)
  RETURNING id INTO v_restaurant_id;

  -- Create default main branch
  INSERT INTO branches (restaurant_id, name, city, is_main_branch, is_active)
  VALUES (v_restaurant_id, 'Main Branch', p_city, TRUE, TRUE)
  RETURNING id INTO v_branch_id;

  -- Create default restaurant settings
  INSERT INTO restaurant_settings (
    restaurant_id,
    waiter_verification_required,
    customer_can_add_items,
    customer_can_remove_confirmed_items,
    waiter_recommendations_enabled,
    customer_name_required,
    customer_phone_required,
    tax_enabled,
    tax_percentage,
    tax_label,
    service_charge_enabled,
    service_charge_percentage,
    auto_accept_kitchen_orders,
    waiter_sound_notifications,
    kitchen_sound_notifications
  ) VALUES (
    v_restaurant_id,
    TRUE, TRUE, FALSE, TRUE, FALSE, TRUE,
    FALSE, 0, 'GST',
    FALSE, 0,
    FALSE, TRUE, TRUE
  );

  RETURN jsonb_build_object(
    'status', 'ok',
    'restaurant_id', v_restaurant_id,
    'branch_id', v_branch_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ADD STAFF MEMBER WITH PERMISSIONS
-- Called by owner/manager to add a staff member
-- ============================================================

CREATE OR REPLACE FUNCTION add_staff_member(
  p_actor_id        UUID,     -- owner or manager
  p_restaurant_id   UUID,
  p_staff_email     TEXT,
  p_staff_name      TEXT,
  p_role            user_role,
  p_branch_id       UUID DEFAULT NULL,
  p_employee_code   TEXT DEFAULT NULL,
  p_permissions     JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_actor_role    user_role;
  v_actor_rest_id UUID;
  v_profile_id    UUID;
  v_staff_id      UUID;
BEGIN
  -- Verify actor belongs to this restaurant with correct role
  SELECT p.role INTO v_actor_role FROM profiles p WHERE p.id = p_actor_id;

  IF v_actor_role = 'platform_admin' THEN
    -- Platform admins have global access
  ELSIF v_actor_role = 'owner' THEN
    -- Must own this specific restaurant
    IF NOT EXISTS (
      SELECT 1 FROM owners o
      JOIN restaurants r ON r.owner_id = o.id
      WHERE o.profile_id = p_actor_id AND r.id = p_restaurant_id AND r.is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'Unauthorized: you do not own this restaurant';
    END IF;
  ELSIF v_actor_role = 'manager' THEN
    -- Must be an active manager at this specific restaurant
    IF NOT EXISTS (
      SELECT 1 FROM staff_members
      WHERE profile_id = p_actor_id AND restaurant_id = p_restaurant_id AND role = 'manager' AND is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'Unauthorized: you are not a manager of this restaurant';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unauthorized: insufficient role';
  END IF;

  -- Find the profile by email via auth.users
  SELECT au.id INTO v_profile_id
  FROM auth.users au
  WHERE au.email = p_staff_email
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'invite_required',
      'email', p_staff_email,
      'message', 'User not found. Send a Supabase invite first.'
    );
  END IF;

  -- Ensure profile exists and has correct role
  INSERT INTO profiles (id, full_name, role, is_active)
  VALUES (v_profile_id, p_staff_name, p_role, TRUE)
  ON CONFLICT (id) DO UPDATE
    SET role = p_role, full_name = COALESCE(p_staff_name, profiles.full_name), is_active = TRUE;

  -- Upsert staff_members
  INSERT INTO staff_members (profile_id, restaurant_id, branch_id, role, employee_code, permissions, is_active)
  VALUES (v_profile_id, p_restaurant_id, p_branch_id, p_role, p_employee_code, p_permissions, TRUE)
  ON CONFLICT (profile_id, restaurant_id) DO UPDATE
    SET role = EXCLUDED.role,
        branch_id = EXCLUDED.branch_id,
        employee_code = EXCLUDED.employee_code,
        permissions = EXCLUDED.permissions,
        is_active = TRUE
  RETURNING id INTO v_staff_id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'staff_id', v_staff_id,
    'profile_id', v_profile_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (RLS still applies inside)
GRANT EXECUTE ON FUNCTION provision_owner TO authenticated;
GRANT EXECUTE ON FUNCTION provision_restaurant TO authenticated;
GRANT EXECUTE ON FUNCTION add_staff_member TO authenticated;
