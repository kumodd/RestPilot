-- ============================================================
-- RestPilot Migration 017: Core security and operations hardening
-- ============================================================
-- This migration closes the trust boundary around operational RPCs.
-- Client supplied actor ids/types are treated as hints only; identity
-- and permissions are derived from auth.uid() and the database.

-- ------------------------------------------------------------
-- Shared access helpers
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION has_branch_access(
  p_restaurant_id UUID,
  p_branch_id UUID
)
RETURNS BOOLEAN AS $$
  SELECT
    is_platform_admin()
    OR owns_restaurant(p_restaurant_id)
    OR EXISTS (
      SELECT 1
      FROM staff_members sm
      WHERE sm.profile_id = auth.uid()
        AND sm.restaurant_id = p_restaurant_id
        AND sm.is_active = TRUE
        AND (sm.branch_id IS NULL OR sm.branch_id = p_branch_id)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_restaurant_manager(p_restaurant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    is_platform_admin()
    OR owns_restaurant(p_restaurant_id)
    OR EXISTS (
      SELECT 1
      FROM staff_members sm
      WHERE sm.profile_id = auth.uid()
        AND sm.restaurant_id = p_restaurant_id
        AND sm.role = 'manager'
        AND sm.is_active = TRUE
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- Order creation integrity
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_order_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_session table_sessions%ROWTYPE;
  v_accepting BOOLEAN;
  v_session_id UUID;
  v_settings restaurant_settings%ROWTYPE;
BEGIN
  SELECT r.is_accepting_orders
  INTO v_accepting
  FROM restaurants r
  WHERE r.id = NEW.restaurant_id
    AND r.is_active = TRUE;

  IF COALESCE(v_accepting, FALSE) = FALSE THEN
    RAISE EXCEPTION 'Restaurant is not accepting orders';
  END IF;

  SELECT * INTO v_settings FROM restaurant_settings WHERE restaurant_id = NEW.restaurant_id;
  IF COALESCE(v_settings.customer_name_required, FALSE)
     AND NULLIF(BTRIM(NEW.customer_name_snapshot), '') IS NULL THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  IF COALESCE(v_settings.customer_phone_required, FALSE)
     AND NULLIF(BTRIM(NEW.customer_phone_snapshot), '') IS NULL THEN
    RAISE EXCEPTION 'Customer phone is required';
  END IF;
  IF COALESCE(v_settings.waiter_verification_required, TRUE) = FALSE
     OR COALESCE(v_settings.auto_accept_kitchen_orders, FALSE) = TRUE THEN
    NEW.status := 'confirmed';
    NEW.confirmed_at := NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM restaurant_tables rt
    WHERE rt.id = NEW.table_id
      AND rt.restaurant_id = NEW.restaurant_id
      AND rt.branch_id = NEW.branch_id
      AND rt.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Invalid table for order';
  END IF;

  IF NEW.table_session_id IS NULL THEN
    INSERT INTO table_sessions (
      table_id, branch_id, restaurant_id, session_token, is_active
    ) VALUES (
      NEW.table_id,
      NEW.branch_id,
      NEW.restaurant_id,
      encode(gen_random_bytes(24), 'hex'),
      TRUE
    ) RETURNING id INTO v_session_id;
    NEW.table_session_id := v_session_id;
  ELSE
    SELECT * INTO v_session
    FROM table_sessions ts
    WHERE ts.id = NEW.table_session_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_session.table_id <> NEW.table_id
       OR v_session.branch_id <> NEW.branch_id
       OR v_session.restaurant_id <> NEW.restaurant_id
       OR v_session.is_active = FALSE THEN
      RAISE EXCEPTION 'Invalid or inactive table session';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS validate_order_before_insert ON orders;
CREATE TRIGGER validate_order_before_insert
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_insert();

CREATE OR REPLACE FUNCTION validate_order_item_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_item menu_items%ROWTYPE;
  v_category menu_categories%ROWTYPE;
  v_max_items INTEGER;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  SELECT * INTO v_item
  FROM menu_items
  WHERE id = NEW.menu_item_id
    AND restaurant_id = v_order.restaurant_id
    AND is_active = TRUE
    AND is_available = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Menu item is unavailable';
  END IF;

  SELECT * INTO v_category
  FROM menu_categories
  WHERE id = v_item.category_id
    AND restaurant_id = v_order.restaurant_id
    AND is_active = TRUE
    AND is_available = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Menu category is unavailable';
  END IF;

  SELECT max_items_per_order INTO v_max_items
  FROM restaurant_settings
  WHERE restaurant_id = v_order.restaurant_id;

  IF NEW.quantity < 1 OR NEW.quantity > COALESCE(v_max_items, 200) THEN
    RAISE EXCEPTION 'Invalid item quantity';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS validate_order_item_before_insert ON order_items;
CREATE TRIGGER validate_order_item_before_insert
  BEFORE INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_item_insert();

CREATE OR REPLACE FUNCTION validate_order_modifier_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_item order_items%ROWTYPE;
  v_menu_item_id UUID;
  v_match BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_item FROM order_items WHERE id = NEW.order_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order item not found'; END IF;
  v_menu_item_id := v_item.menu_item_id;

  IF NEW.modifier_type = 'variant' THEN
    SELECT EXISTS (
      SELECT 1
      FROM menu_item_variants miv, jsonb_array_elements(miv.options) option_data
      WHERE miv.menu_item_id = v_menu_item_id
        AND miv.is_required IS NOT NULL
        AND miv.name = NEW.modifier_name_snapshot
        AND option_data->>'name' = NEW.option_name_snapshot
    ) INTO v_match;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM menu_addons ma
      WHERE ma.restaurant_id = (SELECT restaurant_id FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE oi.id = NEW.order_item_id)
        AND ma.name = NEW.modifier_name_snapshot
        AND ma.is_active = TRUE
        AND (ma.menu_item_id IS NULL OR ma.menu_item_id = v_menu_item_id)
    ) INTO v_match;
  END IF;

  IF NOT v_match THEN RAISE EXCEPTION 'Invalid or unavailable order modifier'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS validate_order_modifier_before_insert ON order_item_modifiers;
CREATE TRIGGER validate_order_modifier_before_insert
  BEFORE INSERT ON order_item_modifiers
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_modifier_insert();

-- Regenerated QR codes cannot leave multiple active tokens for one table.
CREATE OR REPLACE FUNCTION deactivate_previous_table_qrs()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE qr_codes
  SET is_active = FALSE, updated_at = NOW()
  WHERE table_id = NEW.table_id
    AND id <> NEW.id
    AND is_active = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS deactivate_previous_table_qrs_trigger ON qr_codes;
CREATE TRIGGER deactivate_previous_table_qrs_trigger
  AFTER INSERT ON qr_codes
  FOR EACH ROW
  WHEN (NEW.is_active = TRUE)
  EXECUTE FUNCTION deactivate_previous_table_qrs();

-- ------------------------------------------------------------
-- Authoritative order transitions
-- ------------------------------------------------------------

DROP FUNCTION IF EXISTS transition_order_status(UUID, order_status, UUID, actor_type, JSONB);

CREATE OR REPLACE FUNCTION transition_order_status(
  p_order_id UUID,
  p_new_status order_status,
  p_actor_id UUID DEFAULT NULL,
  p_actor_type TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_profile_role TEXT;
  v_actor_id UUID := auth.uid();
  v_event_type order_event_type;
  v_allowed BOOLEAN := FALSE;
  v_actor_type actor_type;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;

  IF NOT has_branch_access(v_order.restaurant_id, v_order.branch_id) THEN
    RETURN jsonb_build_object('error', 'Unauthorized for this branch');
  END IF;

  SELECT p.role::TEXT INTO v_profile_role
  FROM profiles p
  WHERE p.id = v_actor_id AND p.is_active = TRUE;

  IF v_profile_role IS NULL THEN
    RETURN jsonb_build_object('error', 'Active profile not found');
  END IF;

  -- Only the database identity determines the actor type. The RPC argument
  -- is retained for backwards compatibility with existing clients.
  v_actor_type := CASE v_profile_role
    WHEN 'owner' THEN 'owner'::actor_type
    WHEN 'platform_admin' THEN 'platform_admin'::actor_type
    WHEN 'waiter' THEN 'waiter'::actor_type
    WHEN 'chef' THEN 'chef'::actor_type
    WHEN 'kitchen_manager' THEN 'chef'::actor_type
    ELSE 'manager'::actor_type
  END;

  v_allowed := CASE
    WHEN v_profile_role IN ('owner', 'platform_admin', 'manager') THEN
      (v_order.status = 'placed' AND p_new_status = 'awaiting_waiter_verification') OR
      (v_order.status = 'awaiting_waiter_verification' AND p_new_status = 'waiter_reviewing') OR
      (v_order.status = 'waiter_reviewing' AND p_new_status IN ('confirmed', 'rejected', 'cancelled')) OR
      (v_order.status = 'confirmed' AND p_new_status = 'kitchen_accepted') OR
      (v_order.status = 'kitchen_accepted' AND p_new_status = 'preparing') OR
      (v_order.status = 'preparing' AND p_new_status = 'ready') OR
      (v_order.status = 'ready' AND p_new_status = 'served') OR
      (v_order.status = 'served' AND p_new_status = 'completed') OR
      (v_order.status IN ('placed', 'awaiting_waiter_verification', 'waiter_reviewing', 'confirmed') AND p_new_status = 'cancelled')
    WHEN v_profile_role = 'waiter' THEN
      (v_order.status = 'placed' AND p_new_status = 'awaiting_waiter_verification') OR
      (v_order.status = 'awaiting_waiter_verification' AND p_new_status = 'waiter_reviewing') OR
      (v_order.status = 'waiter_reviewing' AND p_new_status IN ('confirmed', 'rejected', 'cancelled')) OR
      (v_order.status = 'ready' AND p_new_status = 'served')
    WHEN v_profile_role IN ('chef', 'kitchen_manager') THEN
      (v_order.status = 'confirmed' AND p_new_status = 'kitchen_accepted') OR
      (v_order.status = 'kitchen_accepted' AND p_new_status = 'preparing') OR
      (v_order.status = 'preparing' AND p_new_status = 'ready')
    WHEN v_profile_role = 'cashier' THEN
      (v_order.status = 'served' AND p_new_status = 'completed')
    ELSE FALSE
  END;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object(
      'error', format('Role %s cannot transition %s to %s', v_profile_role, v_order.status, p_new_status)
    );
  END IF;

  v_event_type := CASE p_new_status
    WHEN 'awaiting_waiter_verification' THEN 'order_placed'
    WHEN 'waiter_reviewing' THEN 'waiter_reviewing'
    WHEN 'confirmed' THEN 'order_confirmed'
    WHEN 'kitchen_accepted' THEN 'kitchen_accepted'
    WHEN 'preparing' THEN 'preparing_started'
    WHEN 'ready' THEN 'order_ready'
    WHEN 'served' THEN 'order_served'
    WHEN 'completed' THEN 'order_completed'
    WHEN 'cancelled' THEN 'order_cancelled'
    WHEN 'rejected' THEN 'order_rejected'
    ELSE 'order_placed'
  END;

  UPDATE orders SET
    status = p_new_status,
    waiter_assigned_at = CASE WHEN p_new_status = 'waiter_reviewing' THEN NOW() ELSE waiter_assigned_at END,
    verified_at = CASE WHEN p_new_status = 'confirmed' THEN NOW() ELSE verified_at END,
    confirmed_at = CASE WHEN p_new_status = 'confirmed' THEN NOW() ELSE confirmed_at END,
    kitchen_accepted_at = CASE WHEN p_new_status = 'kitchen_accepted' THEN NOW() ELSE kitchen_accepted_at END,
    preparing_started_at = CASE WHEN p_new_status = 'preparing' THEN NOW() ELSE preparing_started_at END,
    ready_at = CASE WHEN p_new_status = 'ready' THEN NOW() ELSE ready_at END,
    served_at = CASE WHEN p_new_status = 'served' THEN NOW() ELSE served_at END,
    completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
    cancelled_at = CASE WHEN p_new_status IN ('cancelled', 'rejected') THEN NOW() ELSE cancelled_at END,
    assigned_waiter_id = CASE
      WHEN v_profile_role = 'waiter' THEN v_actor_id
      ELSE assigned_waiter_id
    END
  WHERE id = p_order_id;

  INSERT INTO order_events (order_id, event_type, actor_type, actor_id, metadata)
  VALUES (
    p_order_id,
    v_event_type,
    v_actor_type,
    v_actor_id,
    COALESCE(p_metadata, '{}') || jsonb_build_object('derived_role', v_profile_role)
  );

  RETURN jsonb_build_object('success', TRUE, 'new_status', p_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Status and item changes must go through the authoritative functions.
REVOKE EXECUTE ON FUNCTION has_branch_access(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION has_branch_access(UUID, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION is_restaurant_manager(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION is_restaurant_manager(UUID) TO authenticated;

DROP POLICY IF EXISTS "orders_update_staff" ON orders;
CREATE POLICY "orders_update_via_rpc_only"
  ON orders FOR UPDATE
  USING (FALSE)
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "order_items_update_staff" ON order_items;
CREATE POLICY "order_items_update_via_rpc_only"
  ON order_items FOR UPDATE
  USING (FALSE)
  WITH CHECK (FALSE);

CREATE OR REPLACE FUNCTION update_order_item_status(
  p_item_id UUID,
  p_new_status item_status
)
RETURNS JSONB AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_item order_items%ROWTYPE;
  v_role TEXT;
BEGIN
  SELECT oi.* INTO v_item FROM order_items oi WHERE oi.id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Order item not found'); END IF;

  SELECT o.* INTO v_order FROM orders o WHERE o.id = v_item.order_id FOR UPDATE;
  IF NOT has_branch_access(v_order.restaurant_id, v_order.branch_id) THEN
    RETURN jsonb_build_object('error', 'Unauthorized for this branch');
  END IF;

  SELECT role::TEXT INTO v_role FROM profiles WHERE id = auth.uid() AND is_active = TRUE;
  IF v_role NOT IN ('owner', 'platform_admin', 'manager', 'chef', 'kitchen_manager') THEN
    RETURN jsonb_build_object('error', 'Insufficient permissions');
  END IF;

  IF v_order.status IN ('placed', 'awaiting_waiter_verification', 'waiter_reviewing', 'cancelled', 'rejected', 'completed') THEN
    RETURN jsonb_build_object('error', 'Items cannot be changed in the current order state');
  END IF;

  UPDATE order_items SET status = p_new_status WHERE id = p_item_id;

  INSERT INTO order_events (order_id, event_type, actor_type, actor_id, metadata)
  VALUES (
    v_order.id,
    'item_modified',
    CASE WHEN v_role IN ('chef', 'kitchen_manager') THEN 'chef'::actor_type ELSE 'manager'::actor_type END,
    auth.uid(),
    jsonb_build_object('order_item_id', p_item_id, 'status', p_new_status, 'derived_role', v_role)
  );

  RETURN jsonb_build_object('success', TRUE, 'status', p_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- Payment integrity and refunds
-- ------------------------------------------------------------

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT;

UPDATE payments p
SET branch_id = o.branch_id
FROM orders o
WHERE o.id = p.order_id
  AND p.branch_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_branch_created_at
  ON payments(branch_id, created_at DESC);

DROP POLICY IF EXISTS payments_select ON payments;
CREATE POLICY payments_select_branch_access
  ON payments FOR SELECT
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR (
      branch_id IS NOT NULL
      AND has_branch_access(restaurant_id, branch_id)
    )
  );

DROP POLICY IF EXISTS payments_insert ON payments;
CREATE POLICY payments_insert_via_rpc_only
  ON payments FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS payments_update ON payments;
CREATE POLICY payments_update_via_rpc_only
  ON payments FOR UPDATE
  USING (FALSE)
  WITH CHECK (FALSE);

CREATE OR REPLACE FUNCTION process_secure_payment(
  p_order_id UUID,
  p_method payment_method,
  p_amount DECIMAL,
  p_external_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_payment_id UUID;
  v_role TEXT;
  v_paid DECIMAL(10,2);
  v_outstanding DECIMAL(10,2);
  v_new_status payment_status;
BEGIN
  SELECT role::TEXT INTO v_role FROM profiles WHERE id = auth.uid() AND is_active = TRUE;
  IF v_role NOT IN ('cashier', 'manager', 'owner', 'platform_admin') THEN
    RETURN jsonb_build_object('error', 'Insufficient permissions');
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Order not found'); END IF;
  IF NOT has_branch_access(v_order.restaurant_id, v_order.branch_id) THEN
    RETURN jsonb_build_object('error', 'Unauthorized for this branch');
  END IF;
  IF v_order.status IN ('cancelled', 'rejected') THEN
    RETURN jsonb_build_object('error', 'Cannot pay a cancelled or rejected order');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'Payment amount must be greater than zero');
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid
  FROM payments
  WHERE order_id = p_order_id
    AND status IN ('paid', 'partially_paid');

  v_outstanding := ROUND(GREATEST(v_order.total - v_paid, 0), 2);
  IF p_amount > v_outstanding + 0.01 THEN
    RETURN jsonb_build_object('error', 'Payment exceeds outstanding balance', 'outstanding', v_outstanding);
  END IF;

  v_new_status := CASE
    WHEN p_amount >= v_outstanding - 0.01 THEN 'paid'::payment_status
    ELSE 'partially_paid'::payment_status
  END;

  INSERT INTO payments (
    order_id, restaurant_id, branch_id, status, method, amount, currency,
    external_reference, notes, processed_by, processed_at
  ) VALUES (
    p_order_id, v_order.restaurant_id, v_order.branch_id, v_new_status, p_method, p_amount,
    COALESCE((SELECT currency FROM restaurants WHERE id = v_order.restaurant_id), 'INR'),
    NULLIF(BTRIM(p_external_reference), ''),
    NULLIF(BTRIM(p_notes), ''),
    auth.uid(), NOW()
  ) RETURNING id INTO v_payment_id;

  INSERT INTO order_events (order_id, event_type, actor_type, actor_id, metadata)
  VALUES (
    p_order_id,
    'payment_received',
    CASE WHEN v_role = 'cashier' THEN 'manager'::actor_type ELSE v_role::actor_type END,
    auth.uid(),
    jsonb_build_object('payment_id', v_payment_id, 'amount', p_amount, 'status', v_new_status)
  );

  -- Payment never skips service. A served order is completed only after payment.
  IF v_new_status = 'paid' AND v_order.status = 'served' THEN
    PERFORM transition_order_status(p_order_id, 'completed', auth.uid(), v_role, '{}');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'payment_id', v_payment_id,
    'payment_status', v_new_status,
    'paid', ROUND(v_paid + p_amount, 2),
    'outstanding', ROUND(GREATEST(v_outstanding - p_amount, 0), 2)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION refund_secure_payment(
  p_payment_id UUID,
  p_amount DECIMAL DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_role TEXT;
  v_refund DECIMAL(10,2);
BEGIN
  SELECT role::TEXT INTO v_role FROM profiles WHERE id = auth.uid() AND is_active = TRUE;
  IF v_role NOT IN ('manager', 'owner', 'platform_admin') THEN
    RETURN jsonb_build_object('error', 'Only managers and owners can refund payments');
  END IF;

  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Payment not found'); END IF;
  IF NOT has_branch_access(v_payment.restaurant_id, (SELECT branch_id FROM orders WHERE id = v_payment.order_id)) THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;
  IF v_payment.status NOT IN ('paid', 'partially_paid') THEN
    RETURN jsonb_build_object('error', 'Payment is not refundable');
  END IF;

  v_refund := ROUND(COALESCE(p_amount, v_payment.amount), 2);
  IF v_refund <= 0 OR v_refund > v_payment.amount THEN
    RETURN jsonb_build_object('error', 'Invalid refund amount');
  END IF;

  UPDATE payments
  SET status = CASE WHEN v_refund = v_payment.amount THEN 'refunded' ELSE 'partially_paid' END,
      notes = CONCAT_WS(' | ', notes, 'Refund: ' || COALESCE(NULLIF(BTRIM(p_reason), ''), 'No reason provided'))
  WHERE id = p_payment_id;

  INSERT INTO order_events (order_id, event_type, actor_type, actor_id, metadata)
  VALUES (v_payment.order_id, 'payment_received', 'manager', auth.uid(),
    jsonb_build_object('refund', v_refund, 'payment_id', p_payment_id, 'reason', p_reason));

  RETURN jsonb_build_object('success', TRUE, 'refunded', v_refund);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- QR flow and staff invitation compatibility
-- ------------------------------------------------------------

DROP FUNCTION IF EXISTS place_order_from_qr(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION place_order_from_qr(
  p_qr_token TEXT,
  p_table_session_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_notes TEXT,
  p_client_request_id TEXT,
  p_items JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_qr qr_codes%ROWTYPE;
  v_session table_sessions%ROWTYPE;
  v_session_id UUID;
  v_result JSONB;
BEGIN
  SELECT * INTO v_qr
  FROM qr_codes
  WHERE token = p_qr_token AND is_active = TRUE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Invalid or inactive QR code'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM restaurants
    WHERE id = v_qr.restaurant_id AND is_active = TRUE AND is_accepting_orders = TRUE
  ) THEN
    RETURN jsonb_build_object('error', 'Restaurant is not accepting orders currently');
  END IF;

  IF p_table_session_id IS NOT NULL THEN
    SELECT * INTO v_session
    FROM table_sessions ts
    WHERE ts.id = p_table_session_id
      AND ts.table_id = v_qr.table_id
      AND ts.branch_id = v_qr.branch_id
      AND ts.restaurant_id = v_qr.restaurant_id
      AND ts.is_active = TRUE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Invalid table session'); END IF;
    v_session_id := v_session.id;
  ELSE
    SELECT id INTO v_session_id
    FROM table_sessions
    WHERE table_id = v_qr.table_id
      AND branch_id = v_qr.branch_id
      AND restaurant_id = v_qr.restaurant_id
      AND is_active = TRUE
    ORDER BY started_at DESC
    LIMIT 1;
    IF v_session_id IS NULL THEN
      INSERT INTO table_sessions (
        table_id, branch_id, restaurant_id, session_token, is_active
      ) VALUES (
        v_qr.table_id, v_qr.branch_id, v_qr.restaurant_id,
        encode(gen_random_bytes(24), 'hex'), TRUE
      ) RETURNING id INTO v_session_id;
    END IF;
  END IF;

  v_result := create_order_secure(
    v_qr.restaurant_id, v_qr.branch_id, v_qr.table_id, v_session_id,
    NULLIF(BTRIM(p_customer_name), ''), NULLIF(BTRIM(p_customer_phone), ''),
    NULLIF(BTRIM(p_customer_notes), ''), p_client_request_id, p_items
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- The Flutter client used the old name. Keep a compatibility alias with the
-- same authorization semantics as the canonical invitation function.
CREATE OR REPLACE FUNCTION invite_staff(
  p_restaurant_id UUID,
  p_branch_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'waiter',
  p_invited_by UUID DEFAULT NULL,
  p_permissions JSONB DEFAULT '{}'
)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_role TEXT;
BEGIN
  SELECT role::TEXT INTO v_role FROM profiles WHERE id = auth.uid() AND is_active = TRUE;
  IF NOT is_restaurant_manager(p_restaurant_id) THEN
    RAISE EXCEPTION 'Not authorized to invite staff';
  END IF;
  IF p_email IS NULL OR BTRIM(p_email) = '' THEN RAISE EXCEPTION 'Email is required'; END IF;
  IF p_role NOT IN ('manager', 'waiter', 'chef', 'kitchen_manager', 'cashier') THEN
    RAISE EXCEPTION 'Invalid staff role';
  END IF;

  v_token := encode(gen_random_bytes(16), 'hex');
  INSERT INTO invitations (restaurant_id, branch_id, role, email, token, expires_at, invited_by)
  VALUES (p_restaurant_id, p_branch_id, p_role::user_role, LOWER(BTRIM(p_email)), v_token,
          NOW() + INTERVAL '7 days', auth.uid());
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION request_bill_from_order_token(p_order_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE order_token = p_order_token FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Order not found'); END IF;
  IF v_order.status IN ('completed', 'cancelled', 'rejected') THEN
    RETURN jsonb_build_object('error', 'This order is already closed');
  END IF;

  UPDATE restaurant_tables SET status = 'bill_requested', updated_at = NOW()
  WHERE id = v_order.table_id;
  INSERT INTO order_events (order_id, event_type, actor_type, metadata)
  VALUES (v_order.id, 'bill_requested', 'customer', jsonb_build_object('source', 'order_token'));
  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- Permissions for the public API surface
-- ------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION create_order_secure(UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION transition_order_status(UUID, order_status, UUID, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION update_order_item_status(UUID, item_status) FROM anon;
REVOKE EXECUTE ON FUNCTION process_secure_payment(UUID, payment_method, DECIMAL, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION refund_secure_payment(UUID, DECIMAL, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION transition_order_status(UUID, order_status, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_order_item_status(UUID, item_status) TO authenticated;
GRANT EXECUTE ON FUNCTION process_secure_payment(UUID, payment_method, DECIMAL, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_secure_payment(UUID, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION place_order_from_qr(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION invite_staff(UUID, UUID, TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION request_bill_from_order_token(TEXT) TO anon, authenticated;
