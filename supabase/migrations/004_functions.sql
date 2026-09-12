-- ============================================================
-- RestPilot Multi-Tenant Restaurant Platform
-- Migration 004: Database Functions & Realtime Setup
-- ============================================================

-- ============================================================
-- SECURE ORDER NUMBER GENERATION (per restaurant)
-- ============================================================

CREATE OR REPLACE FUNCTION get_next_order_number(p_restaurant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_counter INTEGER;
BEGIN
  -- Atomic increment using advisory lock
  PERFORM pg_advisory_xact_lock(hashtext(p_restaurant_id::text));
  
  SELECT COALESCE(MAX(order_number), 999) + 1
  INTO v_counter
  FROM orders
  WHERE restaurant_id = p_restaurant_id;
  
  RETURN v_counter;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SECURE ORDER CREATION (called from Edge Function)
-- ============================================================

CREATE OR REPLACE FUNCTION create_order_secure(
  p_restaurant_id UUID,
  p_branch_id UUID,
  p_table_id UUID,
  p_table_session_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_notes TEXT,
  p_client_request_id TEXT,
  p_items JSONB -- [{menu_item_id, quantity, variant_selections, addon_ids, special_instructions}]
)
RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_order_number INTEGER;
  v_order_token TEXT;
  v_subtotal DECIMAL(10,2) := 0;
  v_tax DECIMAL(10,2) := 0;
  v_service_charge DECIMAL(10,2) := 0;
  v_total DECIMAL(10,2) := 0;
  v_settings restaurant_settings%ROWTYPE;
  v_item JSONB;
  v_menu_item menu_items%ROWTYPE;
  v_order_item_id UUID;
  v_item_total DECIMAL(10,2);
  v_variant JSONB;
  v_addon menu_addons%ROWTYPE;
  v_customer_id UUID;
  v_tax_pct DECIMAL(5,2) := 0;
  v_sc_pct DECIMAL(5,2) := 0;
  v_db_price_delta DECIMAL(10,2);
BEGIN
  -- Check idempotency
  IF p_client_request_id IS NOT NULL THEN
    SELECT id INTO v_order_id FROM orders WHERE client_request_id = p_client_request_id;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'order_id', v_order_id,
        'idempotent', TRUE
      );
    END IF;
  END IF;

  -- Get restaurant settings
  SELECT * INTO v_settings FROM restaurant_settings WHERE restaurant_id = p_restaurant_id;
  IF v_settings.tax_enabled THEN
    v_tax_pct := v_settings.tax_percentage;
  END IF;
  IF v_settings.service_charge_enabled THEN
    v_sc_pct := v_settings.service_charge_percentage;
  END IF;

  -- Verify table belongs to restaurant
  IF NOT EXISTS (
    SELECT 1 FROM restaurant_tables 
    WHERE id = p_table_id 
      AND restaurant_id = p_restaurant_id 
      AND branch_id = p_branch_id
      AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Invalid table for this restaurant';
  END IF;

  -- Generate order number and token
  v_order_number := get_next_order_number(p_restaurant_id);
  v_order_token := encode(gen_random_bytes(16), 'hex');
  v_order_id := uuid_generate_v4();

  -- Upsert customer record
  IF p_customer_phone IS NOT NULL THEN
    INSERT INTO customers (restaurant_id, name, phone)
    VALUES (p_restaurant_id, p_customer_name, p_customer_phone)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_customer_id;
    
    IF v_customer_id IS NULL THEN
      SELECT id INTO v_customer_id FROM customers
      WHERE restaurant_id = p_restaurant_id AND phone = p_customer_phone
      LIMIT 1;
    END IF;
  END IF;

  -- Create order record
  INSERT INTO orders (
    id, restaurant_id, branch_id, table_id, table_session_id, customer_id,
    order_number, status, customer_name_snapshot, customer_phone_snapshot,
    client_request_id, order_token, customer_notes, placed_at
  ) VALUES (
    v_order_id, p_restaurant_id, p_branch_id, p_table_id, p_table_session_id, v_customer_id,
    v_order_number, 'placed', p_customer_name, p_customer_phone,
    p_client_request_id, v_order_token, p_customer_notes, NOW()
  );

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Get current menu item price (NEVER trust client price)
    SELECT * INTO v_menu_item
    FROM menu_items
    WHERE id = (v_item->>'menu_item_id')::UUID
      AND restaurant_id = p_restaurant_id
      AND is_active = TRUE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Menu item % not found or unavailable', v_item->>'menu_item_id';
    END IF;

    v_item_total := v_menu_item.base_price * (v_item->>'quantity')::INTEGER;
    v_order_item_id := uuid_generate_v4();

    -- Insert order item
    INSERT INTO order_items (
      id, order_id, menu_item_id,
      item_name_snapshot, item_description_snapshot, unit_price_snapshot,
      quantity, line_total, special_instructions, added_by_actor_type
    ) VALUES (
      v_order_item_id, v_order_id, v_menu_item.id,
      v_menu_item.name, v_menu_item.description, v_menu_item.base_price,
      (v_item->>'quantity')::INTEGER, v_item_total,
      v_item->>'special_instructions', 'customer'
    );

    -- Process variants
    FOR v_variant IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'variant_selections', '[]'::jsonb))
    LOOP
      -- Securely lookup price
      v_db_price_delta := (
        SELECT COALESCE((opt->>'price_delta')::DECIMAL, 0)
        FROM menu_item_variants miv, jsonb_array_elements(miv.options) opt
        WHERE miv.menu_item_id = v_menu_item.id 
          AND miv.name = v_variant->>'variant_name'
          AND opt->>'name' = v_variant->>'option_name'
        LIMIT 1
      );

      IF v_db_price_delta IS NULL THEN
        RAISE EXCEPTION 'Invalid variant % for item %', v_variant->>'variant_name', v_menu_item.name;
      END IF;

      INSERT INTO order_item_modifiers (
        order_item_id, modifier_type, modifier_name_snapshot, option_name_snapshot, price_snapshot
      ) VALUES (
        v_order_item_id, 'variant',
        v_variant->>'variant_name', v_variant->>'option_name',
        v_db_price_delta
      );
      v_item_total := v_item_total + v_db_price_delta * (v_item->>'quantity')::INTEGER;
    END LOOP;

    -- Process addons
    FOR v_addon IN
      SELECT ma.* FROM menu_addons ma
      WHERE ma.id = ANY(
        ARRAY(SELECT (e)::UUID FROM jsonb_array_elements_text(COALESCE(v_item->'addon_ids', '[]'::jsonb)) AS e)
      )
      AND ma.restaurant_id = p_restaurant_id
    LOOP
      INSERT INTO order_item_modifiers (
        order_item_id, modifier_type, modifier_name_snapshot, option_name_snapshot, price_snapshot
      ) VALUES (
        v_order_item_id, 'addon', v_addon.name, NULL, v_addon.price
      );
      v_item_total := v_item_total + v_addon.price * (v_item->>'quantity')::INTEGER;
    END LOOP;

    -- Update line total with modifiers
    UPDATE order_items SET line_total = v_item_total WHERE id = v_order_item_id;
    v_subtotal := v_subtotal + v_item_total;
  END LOOP;

  -- Calculate tax and service charge
  v_tax := ROUND(v_subtotal * v_tax_pct / 100, 2);
  v_service_charge := ROUND(v_subtotal * v_sc_pct / 100, 2);
  v_total := v_subtotal + v_tax + v_service_charge;

  -- Update order totals
  UPDATE orders
  SET subtotal = v_subtotal, tax = v_tax, service_charge = v_service_charge, total = v_total
  WHERE id = v_order_id;

  -- Log order event
  INSERT INTO order_events (order_id, event_type, actor_type, metadata)
  VALUES (
    v_order_id, 'order_placed', 'customer',
    jsonb_build_object('total', v_total, 'item_count', jsonb_array_length(p_items))
  );

  -- Update table status
  UPDATE restaurant_tables
  SET status = 'order_active', updated_at = NOW()
  WHERE id = p_table_id;

  -- Update customer stats
  IF v_customer_id IS NOT NULL THEN
    UPDATE customers
    SET last_order_at = NOW(), last_visit_at = NOW(),
        total_orders = total_orders + 1, total_spent = total_spent + v_total
    WHERE id = v_customer_id;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'order_token', v_order_token,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'service_charge', v_service_charge,
    'total', v_total,
    'idempotent', FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SECURE QR TOKEN RESOLUTION
-- ============================================================

CREATE OR REPLACE FUNCTION resolve_qr_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_qr qr_codes%ROWTYPE;
  v_table restaurant_tables%ROWTYPE;
  v_branch branches%ROWTYPE;
  v_restaurant restaurants%ROWTYPE;
BEGIN
  -- Find active QR code
  SELECT * INTO v_qr FROM qr_codes WHERE token = p_token AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'QR code not found or inactive');
  END IF;

  -- Get table
  SELECT * INTO v_table FROM restaurant_tables WHERE id = v_qr.table_id AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Table not found or inactive');
  END IF;

  -- Get branch
  SELECT * INTO v_branch FROM branches WHERE id = v_qr.branch_id AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Branch not found or inactive');
  END IF;

  -- Get restaurant
  SELECT * INTO v_restaurant FROM restaurants WHERE id = v_qr.restaurant_id AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Restaurant not found or inactive');
  END IF;

  -- Update scan stats
  UPDATE qr_codes
  SET last_scanned_at = NOW(), scan_count = scan_count + 1
  WHERE id = v_qr.id;

  RETURN jsonb_build_object(
    'restaurant', jsonb_build_object(
      'id', v_restaurant.id,
      'name', v_restaurant.name,
      'slug', v_restaurant.slug,
      'logo_url', v_restaurant.logo_url,
      'cover_image_url', v_restaurant.cover_image_url,
      'primary_color', v_restaurant.primary_color,
      'secondary_color', v_restaurant.secondary_color,
      'currency_symbol', v_restaurant.currency_symbol,
      'is_accepting_orders', v_restaurant.is_accepting_orders
    ),
    'branch', jsonb_build_object(
      'id', v_branch.id,
      'name', v_branch.name,
      'city', v_branch.city
    ),
    'table', jsonb_build_object(
      'id', v_table.id,
      'table_number', v_table.table_number,
      'display_name', v_table.display_name,
      'section', v_table.section,
      'floor', v_table.floor
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ORDER STATUS TRANSITION (enforces allowed state machine)
-- ============================================================

CREATE OR REPLACE FUNCTION transition_order_status(
  p_order_id UUID,
  p_new_status order_status,
  p_actor_id UUID DEFAULT NULL,
  p_actor_type actor_type DEFAULT 'system',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_event_type order_event_type;
  v_timestamp_col TEXT;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;

  -- Enforce Authorization
  IF p_actor_type != 'system' THEN
    IF NOT has_restaurant_access(v_order.restaurant_id) THEN
      RETURN jsonb_build_object('error', 'Unauthorized');
    END IF;
  END IF;

  -- Validate transitions
  IF NOT (
    (v_order.status = 'placed' AND p_new_status = 'awaiting_waiter_verification') OR
    (v_order.status = 'awaiting_waiter_verification' AND p_new_status = 'waiter_reviewing') OR
    (v_order.status = 'waiter_reviewing' AND p_new_status = 'confirmed') OR
    (v_order.status = 'confirmed' AND p_new_status = 'kitchen_accepted') OR
    (v_order.status = 'kitchen_accepted' AND p_new_status = 'preparing') OR
    (v_order.status = 'preparing' AND p_new_status = 'ready') OR
    (v_order.status = 'ready' AND p_new_status = 'served') OR
    (v_order.status = 'served' AND p_new_status = 'completed') OR
    (v_order.status IN ('placed','awaiting_waiter_verification','waiter_reviewing','confirmed') AND p_new_status = 'cancelled') OR
    (v_order.status = 'waiter_reviewing' AND p_new_status = 'rejected')
  ) THEN
    RETURN jsonb_build_object(
      'error', format('Invalid transition from %s to %s', v_order.status, p_new_status)
    );
  END IF;

  -- Map status to event type
  v_event_type := CASE p_new_status
    WHEN 'awaiting_waiter_verification' THEN 'order_placed'
    WHEN 'waiter_reviewing' THEN 'waiter_assigned'
    WHEN 'confirmed' THEN 'order_confirmed'
    WHEN 'kitchen_accepted' THEN 'kitchen_accepted'
    WHEN 'preparing' THEN 'preparing_started'
    WHEN 'ready' THEN 'order_ready'
    WHEN 'served' THEN 'order_served'
    WHEN 'completed' THEN 'order_served'
    WHEN 'cancelled' THEN 'order_cancelled'
    WHEN 'rejected' THEN 'order_rejected'
    ELSE 'order_placed'
  END;

  -- Update order status and relevant timestamp
  UPDATE orders SET
    status = p_new_status,
    waiter_assigned_at = CASE WHEN p_new_status = 'waiter_reviewing' THEN NOW() ELSE waiter_assigned_at END,
    verified_at = CASE WHEN p_new_status = 'confirmed' THEN NOW() ELSE verified_at END,
    confirmed_at = CASE WHEN p_new_status = 'confirmed' THEN NOW() ELSE confirmed_at END,
    kitchen_accepted_at = CASE WHEN p_new_status = 'kitchen_accepted' THEN NOW() ELSE kitchen_accepted_at END,
    preparing_started_at = CASE WHEN p_new_status = 'preparing' THEN NOW() ELSE preparing_started_at END,
    ready_at = CASE WHEN p_new_status = 'ready' THEN NOW() ELSE ready_at END,
    served_at = CASE WHEN p_new_status = 'served' THEN NOW() ELSE served_at END,
    completed_at = CASE WHEN p_new_status IN ('completed','served') THEN NOW() ELSE completed_at END,
    cancelled_at = CASE WHEN p_new_status IN ('cancelled','rejected') THEN NOW() ELSE cancelled_at END,
    assigned_waiter_id = CASE WHEN p_actor_type = 'waiter' AND p_actor_id IS NOT NULL THEN p_actor_id ELSE assigned_waiter_id END
  WHERE id = p_order_id;

  -- Log event
  INSERT INTO order_events (order_id, event_type, actor_type, actor_id, metadata)
  VALUES (p_order_id, v_event_type, p_actor_type, p_actor_id, p_metadata);

  RETURN jsonb_build_object('success', TRUE, 'new_status', p_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SUPABASE REALTIME — Enable on operational tables
-- ============================================================

-- Enable realtime publication for live operational tables
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE order_events;
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
