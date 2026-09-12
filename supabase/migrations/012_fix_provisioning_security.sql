-- ============================================================
-- RestPilot Multi-Tenant Restaurant Platform
-- Migration 012: Security Fix — Provisioning RPC Authorization
-- ============================================================
-- ADM-SEC-P0-002: provision_owner trusted caller-supplied p_admin_id.
--                 Now uses auth.uid() internally.
-- ADM-SEC-P0-003: provision_restaurant skipped auth when p_actor_id=NULL.
--                 Now always verifies auth.uid().
-- ADM-P1-007: admin_audit_log table created to track all admin actions.
-- ============================================================

-- ============================================================
-- 0. DROP OLD FUNCTION SIGNATURES
-- ============================================================
-- CREATE OR REPLACE only replaces when the parameter list matches exactly.
-- The old signatures differ (p_admin_id, p_actor_id), so Postgres would
-- create overloads instead of replacing. Drop the old versions first.
-- ============================================================

DROP FUNCTION IF EXISTS provision_owner(
  uuid, text, text, text, text, subscription_plan, integer
);

DROP FUNCTION IF EXISTS provision_restaurant(
  uuid, text, text, text, text, text, text, text, uuid
);


-- ============================================================
-- 1. ADMIN AUDIT LOG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  old_data    JSONB DEFAULT '{}',
  new_data    JSONB DEFAULT '{}',
  metadata    JSONB DEFAULT '{}',
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read audit logs
CREATE POLICY "audit_log_admin_select"
  ON admin_audit_log FOR SELECT
  USING (is_platform_admin());

-- Deny all direct client writes — only SECURITY DEFINER functions write
CREATE POLICY "audit_log_insert_deny"
  ON admin_audit_log FOR INSERT
  WITH CHECK (FALSE);

CREATE POLICY "audit_log_update_deny"
  ON admin_audit_log FOR UPDATE
  USING (FALSE);

CREATE POLICY "audit_log_delete_deny"
  ON admin_audit_log FOR DELETE
  USING (FALSE);

CREATE INDEX idx_admin_audit_log_actor   ON admin_audit_log(actor_id);
CREATE INDEX idx_admin_audit_log_entity  ON admin_audit_log(entity_type, entity_id);
CREATE INDEX idx_admin_audit_log_created ON admin_audit_log(created_at DESC);

-- ============================================================
-- 2. INTERNAL AUDIT HELPER (SECURITY DEFINER)
-- ============================================================

CREATE OR REPLACE FUNCTION log_admin_action(
  p_actor_id    UUID,
  p_action      TEXT,
  p_entity_type TEXT,
  p_entity_id   UUID DEFAULT NULL,
  p_old_data    JSONB DEFAULT '{}',
  p_new_data    JSONB DEFAULT '{}',
  p_metadata    JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO admin_audit_log (
    actor_id, action, entity_type, entity_id,
    old_data, new_data, metadata
  ) VALUES (
    p_actor_id, p_action, p_entity_type, p_entity_id,
    COALESCE(p_old_data, '{}'),
    COALESCE(p_new_data, '{}'),
    COALESCE(p_metadata, '{}')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. FIX provision_owner — USE auth.uid() INTERNALLY
-- ============================================================
-- BREAKING CHANGE: p_admin_id parameter removed.
-- The function now verifies the caller via auth.uid() directly.
-- ============================================================

CREATE OR REPLACE FUNCTION provision_owner(
  p_owner_email     TEXT,
  p_owner_name      TEXT,
  p_owner_phone     TEXT,
  p_business_name   TEXT,
  p_plan            subscription_plan DEFAULT 'free',
  p_max_restaurants INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id   UUID;
  v_caller_role user_role;
  v_profile_id  UUID;
  v_owner_id    UUID;
BEGIN
  -- Use auth.uid() — never trust a caller-supplied ID
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is platform_admin
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;
  IF v_caller_role IS DISTINCT FROM 'platform_admin' THEN
    RAISE EXCEPTION 'Unauthorized: caller is not platform_admin';
  END IF;

  -- Look up target user in auth.users by email
  SELECT au.id INTO v_profile_id
  FROM auth.users au
  WHERE au.email = p_owner_email
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'status',  'invite_required',
      'email',   p_owner_email,
      'message', 'No auth user found for this email. Send an invite first.'
    );
  END IF;

  -- Set profile role to 'owner'
  UPDATE profiles
  SET role      = 'owner',
      full_name = COALESCE(p_owner_name, full_name),
      is_active = TRUE
  WHERE id = v_profile_id;

  -- Upsert owners record
  INSERT INTO owners (
    profile_id, business_name, email, phone,
    subscription_plan, subscription_status, max_restaurants, is_active
  )
  VALUES (
    v_profile_id, p_business_name, p_owner_email, p_owner_phone,
    p_plan, 'trial', p_max_restaurants, TRUE
  )
  ON CONFLICT (profile_id) DO UPDATE
    SET business_name      = EXCLUDED.business_name,
        subscription_plan  = EXCLUDED.subscription_plan,
        max_restaurants    = EXCLUDED.max_restaurants,
        is_active          = TRUE
  RETURNING id INTO v_owner_id;

  -- Audit log
  PERFORM log_admin_action(
    v_caller_id, 'provision_owner', 'owner', v_owner_id,
    '{}',
    jsonb_build_object(
      'email', p_owner_email,
      'plan', p_plan,
      'max_restaurants', p_max_restaurants,
      'business_name', p_business_name
    )
  );

  RETURN jsonb_build_object(
    'status',     'ok',
    'profile_id', v_profile_id,
    'owner_id',   v_owner_id,
    'email',      p_owner_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. FIX provision_restaurant — ALWAYS CHECK auth.uid()
-- ============================================================
-- BREAKING CHANGE: p_actor_id parameter removed.
-- NULL p_actor_id can no longer bypass authorization.
-- ============================================================

CREATE OR REPLACE FUNCTION provision_restaurant(
  p_owner_id        UUID,
  p_name            TEXT,
  p_slug            TEXT,
  p_city            TEXT DEFAULT NULL,
  p_phone           TEXT DEFAULT NULL,
  p_email           TEXT DEFAULT NULL,
  p_currency        TEXT DEFAULT 'INR',
  p_currency_symbol TEXT DEFAULT '₹'
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id     UUID;
  v_caller_role   user_role;
  v_restaurant_id UUID;
  v_branch_id     UUID;
  v_max           INTEGER;
  v_current       INTEGER;
  v_owner_name    TEXT;
BEGIN
  -- Use auth.uid() — never trust a caller-supplied ID
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;

  IF v_caller_role = 'platform_admin' THEN
    -- Platform admin can create for any owner — verify owner exists
    IF NOT EXISTS (SELECT 1 FROM owners WHERE id = p_owner_id) THEN
      RAISE EXCEPTION 'Owner not found';
    END IF;

  ELSIF v_caller_role = 'owner' THEN
    -- Owner can only create restaurants under their own owner record
    IF NOT EXISTS (
      SELECT 1 FROM owners WHERE id = p_owner_id AND profile_id = v_caller_id
    ) THEN
      RAISE EXCEPTION 'Unauthorized: you do not own this owner record';
    END IF;

    -- Enforce subscription restaurant limit for owners (not admins)
    SELECT max_restaurants INTO v_max FROM owners WHERE id = p_owner_id;
    SELECT COUNT(*) INTO v_current
    FROM restaurants WHERE owner_id = p_owner_id AND is_active = TRUE;

    IF v_current >= v_max THEN
      RAISE EXCEPTION 'Restaurant limit reached for this subscription plan';
    END IF;

  ELSE
    RAISE EXCEPTION 'Unauthorized: only platform_admin or owner may provision restaurants';
  END IF;

  -- Create restaurant
  INSERT INTO restaurants (
    owner_id, name, slug, city, phone, email,
    currency, currency_symbol, is_active, is_accepting_orders
  )
  VALUES (
    p_owner_id, p_name, p_slug, p_city, p_phone, p_email,
    p_currency, p_currency_symbol, TRUE, TRUE
  )
  RETURNING id INTO v_restaurant_id;

  -- Create default main branch
  INSERT INTO branches (restaurant_id, name, city, is_main_branch, is_active)
  VALUES (v_restaurant_id, 'Main Branch', p_city, TRUE, TRUE)
  RETURNING id INTO v_branch_id;

  -- Create default restaurant settings
  INSERT INTO restaurant_settings (
    restaurant_id,
    waiter_verification_required, customer_can_add_items,
    customer_can_remove_confirmed_items, waiter_recommendations_enabled,
    customer_name_required, customer_phone_required,
    tax_enabled, tax_percentage, tax_label,
    service_charge_enabled, service_charge_percentage,
    auto_accept_kitchen_orders, waiter_sound_notifications, kitchen_sound_notifications
  ) VALUES (
    v_restaurant_id,
    TRUE, TRUE, FALSE, TRUE, FALSE, TRUE,
    FALSE, 0, 'GST',
    FALSE, 0,
    FALSE, TRUE, TRUE
  );

  -- Audit log
  SELECT p.full_name INTO v_owner_name
  FROM owners o
  JOIN profiles p ON p.id = o.profile_id
  WHERE o.id = p_owner_id;

  PERFORM log_admin_action(
    v_caller_id, 'provision_restaurant', 'restaurant', v_restaurant_id,
    '{}',
    jsonb_build_object(
      'name', p_name, 'slug', p_slug,
      'owner_id', p_owner_id, 'owner_name', v_owner_name
    )
  );

  RETURN jsonb_build_object(
    'status',        'ok',
    'restaurant_id', v_restaurant_id,
    'branch_id',     v_branch_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. GRANTS
-- ============================================================

GRANT EXECUTE ON FUNCTION provision_owner TO authenticated;
GRANT EXECUTE ON FUNCTION provision_restaurant TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;
