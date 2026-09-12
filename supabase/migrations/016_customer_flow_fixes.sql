-- ============================================================
-- RestPilot Multi-Tenant Restaurant Platform
-- Migration 016: Customer QR Flow Fixes
-- ============================================================

-- ============================================================
-- 1. SECURE ORDER CREATION FROM QR TOKEN
-- ============================================================
-- This wraps the existing create_order_secure function, but strictly
-- derives the table, branch, and restaurant IDs from the provided QR token.
-- This guarantees the client cannot tamper with the UUIDs.

CREATE OR REPLACE FUNCTION place_order_from_qr(
  p_qr_token TEXT,
  p_table_session_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_notes TEXT,
  p_client_request_id TEXT,
  p_items JSONB -- [{menu_item_id, quantity, variant_selections, addon_ids, special_instructions}]
)
RETURNS JSONB AS $$
DECLARE
  v_qr qr_codes%ROWTYPE;
  v_table restaurant_tables%ROWTYPE;
  v_branch branches%ROWTYPE;
  v_restaurant restaurants%ROWTYPE;
BEGIN
  -- 1. Find active QR code
  SELECT * INTO v_qr FROM qr_codes WHERE token = p_qr_token AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or inactive QR code');
  END IF;

  -- 2. Verify Table
  SELECT * INTO v_table FROM restaurant_tables WHERE id = v_qr.table_id AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Table not found or inactive');
  END IF;

  -- 3. Verify Branch
  SELECT * INTO v_branch FROM branches WHERE id = v_qr.branch_id AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Branch not found or inactive');
  END IF;

  -- 4. Verify Restaurant
  SELECT * INTO v_restaurant FROM restaurants WHERE id = v_qr.restaurant_id AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Restaurant not found or inactive');
  END IF;

  IF NOT v_restaurant.is_accepting_orders THEN
    RETURN jsonb_build_object('error', 'Restaurant is not accepting orders currently');
  END IF;

  -- 5. Create the order securely using validated internal IDs
  RETURN create_order_secure(
    v_restaurant.id,
    v_branch.id,
    v_table.id,
    p_table_session_id,
    p_customer_name,
    p_customer_phone,
    p_customer_notes,
    p_client_request_id,
    p_items
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 2. GET ACTIVE ORDERS BY PHONE (Order Recovery)
-- ============================================================
-- Securely returns active orders for a customer phone number within a specific restaurant.
-- Prevents order enumeration by matching phone strictly.

CREATE OR REPLACE FUNCTION get_active_orders_by_phone(
  p_restaurant_id UUID,
  p_phone TEXT
) RETURNS JSONB AS $$
DECLARE
  v_orders JSONB;
BEGIN
  IF p_phone IS NULL OR BTRIM(p_phone) = '' THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'order_token', o.order_token,
      'order_number', o.order_number,
      'status', o.status,
      'table_number', t.table_number,
      'placed_at', o.placed_at,
      'total', o.total
    ) ORDER BY o.placed_at DESC
  ), '[]'::jsonb)
  INTO v_orders
  FROM orders o
  JOIN restaurant_tables t ON o.table_id = t.id
  WHERE o.restaurant_id = p_restaurant_id
    AND o.customer_phone_snapshot = BTRIM(p_phone)
    AND o.status NOT IN ('completed', 'cancelled', 'rejected');

  RETURN v_orders;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
