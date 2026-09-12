-- ============================================================
-- Migration 015: Audit Remediation
-- Fixes P0/P1 issues identified in the production audit
-- ============================================================

-- ============================================================
-- 1. FIX: Role Escalation via Signup (P0)
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

  -- Safely extract role, completely blocking 'platform_admin' from direct signups
  v_role_raw := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', '')), '');
  IF v_role_raw = 'platform_admin' THEN
    v_role := 'waiter'; -- Malicious escalation attempt, fallback to lowest role
  ELSIF v_role_raw IN ('owner','manager','waiter','chef','kitchen_manager','cashier') THEN
    v_role := v_role_raw::user_role;
  END IF;

  INSERT INTO profiles (id, full_name, role, is_active)
  VALUES (NEW.id, v_full_name, v_role, TRUE)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. FIX: Orders & Order Items RLS Bypass / Integrity (P0 / P2)
-- ============================================================

CREATE OR REPLACE FUNCTION protect_orders_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If this update comes directly from the client (not via a SECURITY DEFINER RPC)
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.status = OLD.status;
    NEW.total = OLD.total;
    NEW.subtotal = OLD.subtotal;
    NEW.tax = OLD.tax;
    NEW.service_charge = OLD.service_charge;
    NEW.order_number = OLD.order_number;
    NEW.restaurant_id = OLD.restaurant_id;
    NEW.branch_id = OLD.branch_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_orders_security ON orders;
CREATE TRIGGER ensure_orders_security
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION protect_orders_fields();

CREATE OR REPLACE FUNCTION validate_order_item_update()
RETURNS TRIGGER AS $$
DECLARE
  v_order_status order_status;
BEGIN
  -- If this update comes directly from the client (e.g., KDS updating status)
  IF current_user IN ('authenticated', 'anon') THEN
    -- Protect financial and identity fields
    NEW.price = OLD.price;
    NEW.line_total = OLD.line_total;
    NEW.quantity = OLD.quantity;
    NEW.order_id = OLD.order_id;
    NEW.menu_item_id = OLD.menu_item_id;
    
    -- State machine validation for order_items
    IF NEW.status != OLD.status THEN
      SELECT status INTO v_order_status FROM orders WHERE id = NEW.order_id;
      
      IF v_order_status IN ('cancelled', 'rejected', 'completed') THEN
        RAISE EXCEPTION 'Cannot update item status for a % order', v_order_status;
      END IF;
      
      IF v_order_status IN ('placed', 'awaiting_waiter_verification', 'waiter_reviewing') THEN
        RAISE EXCEPTION 'Cannot update item status before order is confirmed';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_order_items_security ON order_items;
CREATE TRIGGER ensure_order_items_security
  BEFORE UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_item_update();

-- ============================================================
-- 3. FIX: Double Billing Concurrency & Integrity (P1)
-- ============================================================

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
  v_actor_id UUID;
  v_actor_role TEXT;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;
  
  SELECT role INTO v_actor_role FROM profiles WHERE id = v_actor_id;
  IF v_actor_role NOT IN ('cashier', 'manager', 'owner', 'platform_admin') THEN
    RETURN jsonb_build_object('error', 'Insufficient permissions');
  END IF;

  -- 1. Atomic Lock on the Order to prevent concurrent cashier requests
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;
  
  IF v_order.status = 'completed' THEN
    RETURN jsonb_build_object('error', 'Order is already completed');
  END IF;
  
  -- 2. Insert Payment securely
  INSERT INTO payments (
    order_id, restaurant_id, status, method, amount, external_reference, notes, processed_by, processed_at
  ) VALUES (
    p_order_id, v_order.restaurant_id, 'completed', p_method, p_amount, p_external_reference, p_notes, v_actor_id, NOW()
  ) RETURNING id INTO v_payment_id;
  
  -- 3. Transition the order status securely via internal RPC call
  PERFORM transition_order_status(p_order_id, 'completed', v_actor_id, v_actor_role::actor_type);
  
  RETURN jsonb_build_object('success', TRUE, 'payment_id', v_payment_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
