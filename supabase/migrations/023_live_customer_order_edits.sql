-- ============================================================
-- RestPilot Migration 023: Live customer order additions and edits
-- ============================================================

-- Customer edits are represented as order events. The notification trigger
-- below delivers every addition, modification, and removal to staff.
CREATE OR REPLACE FUNCTION process_order_event_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_staff RECORD;
  v_roles TEXT[];
  v_title TEXT;
  v_body TEXT;
  v_type TEXT;
  v_url TEXT;
  v_table_label TEXT;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, 'Table ' || table_number)
  INTO v_table_label
  FROM restaurant_tables WHERE id = v_order.table_id;

  CASE NEW.event_type
    WHEN 'order_placed' THEN
      v_roles := ARRAY['waiter', 'manager'];
      v_title := 'New order received';
      v_body := v_table_label || ' placed order #' || v_order.order_number || '.';
      v_type := 'new_order';
    WHEN 'waiter_reviewing' THEN
      v_roles := ARRAY['manager'];
      v_title := 'Order is being reviewed';
      v_body := 'Order #' || v_order.order_number || ' is under waiter review.';
      v_type := 'order_reviewing';
    WHEN 'order_confirmed', 'kitchen_accepted' THEN
      v_roles := ARRAY['chef', 'kitchen_manager', 'manager'];
      v_title := 'Order ready for kitchen';
      v_body := 'Order #' || v_order.order_number || ' is confirmed for preparation.';
      v_type := 'order_confirmed';
    WHEN 'preparing_started' THEN
      v_roles := ARRAY['manager'];
      v_title := 'Order preparation started';
      v_body := 'Kitchen started order #' || v_order.order_number || '.';
      v_type := 'order_preparing';
    WHEN 'order_ready' THEN
      v_roles := ARRAY['waiter', 'manager'];
      v_title := 'Order ready to serve';
      v_body := v_table_label || ' order #' || v_order.order_number || ' is ready.';
      v_type := 'order_ready';
    WHEN 'order_served' THEN
      v_roles := ARRAY['cashier', 'manager'];
      v_title := 'Order served';
      v_body := 'Order #' || v_order.order_number || ' is ready for settlement.';
      v_type := 'order_served';
    WHEN 'order_completed' THEN
      v_roles := ARRAY['cashier', 'manager'];
      v_title := 'Order completed';
      v_body := 'Order #' || v_order.order_number || ' has been completed.';
      v_type := 'order_completed';
    WHEN 'order_cancelled', 'order_rejected' THEN
      v_roles := ARRAY['waiter', 'chef', 'kitchen_manager', 'cashier', 'manager'];
      v_title := 'Order cancelled';
      v_body := 'Order #' || v_order.order_number || ' was ' || REPLACE(NEW.event_type::TEXT, 'order_', '') || '.';
      v_type := 'order_cancelled';
    WHEN 'bill_requested' THEN
      v_roles := ARRAY['cashier', 'manager'];
      v_title := 'Bill requested';
      v_body := v_table_label || ' requested the bill for order #' || v_order.order_number || '.';
      v_type := 'bill_requested';
    WHEN 'item_added' THEN
      v_roles := ARRAY['waiter', 'chef', 'kitchen_manager', 'manager'];
      v_title := 'Items added to order';
      v_body := 'Customer added items to order #' || v_order.order_number || ' at ' || v_table_label || '.';
      v_type := 'order_item_added';
    WHEN 'item_modified' THEN
      v_roles := ARRAY['waiter', 'chef', 'kitchen_manager', 'manager'];
      v_title := 'Order updated by customer';
      v_body := 'Customer edited order #' || v_order.order_number || ' at ' || v_table_label || '.';
      v_type := 'order_item_modified';
    WHEN 'item_removed' THEN
      v_roles := ARRAY['waiter', 'chef', 'kitchen_manager', 'manager'];
      v_title := 'Items removed from order';
      v_body := 'Customer removed items from order #' || v_order.order_number || ' at ' || v_table_label || '.';
      v_type := 'order_item_removed';
    WHEN 'payment_received' THEN
      v_roles := ARRAY['cashier', 'manager'];
      v_title := 'Payment received';
      v_body := 'A payment was recorded for order #' || v_order.order_number || '.';
      v_type := 'payment_received';
    ELSE
      RETURN NEW;
  END CASE;

  v_url := '/dashboard/' || v_order.restaurant_id || '/' || v_order.branch_id || '/orders?order=' || v_order.id;

  FOR v_staff IN
    SELECT sm.profile_id
    FROM staff_members sm
    WHERE sm.restaurant_id = v_order.restaurant_id
      AND sm.is_active = TRUE
      AND (sm.branch_id IS NULL OR sm.branch_id = v_order.branch_id)
      AND sm.role::TEXT = ANY(v_roles)
      AND NOT EXISTS (
        SELECT 1
        FROM notification_preferences np
        WHERE np.profile_id = sm.profile_id
          AND np.restaurant_id = v_order.restaurant_id
          AND np.event_type = v_type
          AND np.in_app_enabled = FALSE
      )
  LOOP
    INSERT INTO notifications (
      recipient_id, restaurant_id, order_id, title, body, notification_type,
      action_url, metadata, delivered_at
    ) VALUES (
      v_staff.profile_id, v_order.restaurant_id, v_order.id, v_title, v_body,
      v_type, v_url, jsonb_build_object('event_id', NEW.id, 'branch_id', v_order.branch_id, 'event_type', NEW.event_type), NOW()
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_order_event_notifications ON order_events;
CREATE TRIGGER trg_order_event_notifications
  AFTER INSERT ON order_events
  FOR EACH ROW
  EXECUTE FUNCTION process_order_event_notifications();

CREATE OR REPLACE FUNCTION update_customer_order(
  p_order_token TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_item JSONB;
  v_order_item order_items%ROWTYPE;
  v_quantity INTEGER;
  v_unit_price DECIMAL(10,2);
  v_instructions TEXT;
  v_old_total DECIMAL(10,2);
  v_new_subtotal DECIMAL(10,2);
  v_tax DECIMAL(10,2);
  v_service_charge DECIMAL(10,2);
  v_tax_pct DECIMAL(5,2) := 0;
  v_sc_pct DECIMAL(5,2) := 0;
  v_changed BOOLEAN;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RETURN jsonb_build_object('error', 'Invalid order items');
  END IF;

  SELECT * INTO v_order
  FROM orders
  WHERE order_token = p_order_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;

  IF v_order.status IN ('completed', 'cancelled', 'rejected') THEN
    RETURN jsonb_build_object('error', 'This order is already completed');
  END IF;

  v_old_total := v_order.total;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF NULLIF(v_item->>'order_item_id', '') IS NULL THEN
      RETURN jsonb_build_object('error', 'Each edited item must have an order item id');
    END IF;

    SELECT * INTO v_order_item
    FROM order_items
    WHERE id = (v_item->>'order_item_id')::UUID
      AND order_id = v_order.id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Order item does not belong to this order');
    END IF;

    v_quantity := COALESCE(NULLIF(v_item->>'quantity', '')::INTEGER, 0);
    IF v_quantity < 0 OR v_quantity > 200 THEN
      RETURN jsonb_build_object('error', 'Invalid item quantity');
    END IF;

    v_instructions := NULLIF(BTRIM(v_item->>'special_instructions'), '');
    v_changed := v_order_item.quantity IS DISTINCT FROM v_quantity
      OR v_order_item.special_instructions IS DISTINCT FROM v_instructions
      OR (v_quantity = 0 AND v_order_item.status <> 'cancelled');

    IF NOT v_changed THEN
      CONTINUE;
    END IF;

    SELECT v_order_item.unit_price_snapshot + COALESCE(SUM(price_snapshot), 0)
    INTO v_unit_price
    FROM order_item_modifiers
    WHERE order_item_id = v_order_item.id;

    IF v_quantity = 0 THEN
      UPDATE order_items
      SET quantity = 0, line_total = 0, status = 'cancelled',
          special_instructions = v_instructions, updated_at = NOW()
      WHERE id = v_order_item.id;

      INSERT INTO order_events (order_id, event_type, actor_type, metadata)
      VALUES (v_order.id, 'item_removed', 'customer', jsonb_build_object(
        'order_item_id', v_order_item.id, 'previous_quantity', v_order_item.quantity
      ));
    ELSE
      UPDATE order_items
      SET quantity = v_quantity,
          line_total = ROUND(v_unit_price * v_quantity, 2),
          status = CASE WHEN status IN ('cancelled', 'unavailable') THEN 'pending' ELSE status END,
          special_instructions = v_instructions,
          updated_at = NOW()
      WHERE id = v_order_item.id;

      INSERT INTO order_events (order_id, event_type, actor_type, metadata)
      VALUES (v_order.id, 'item_modified', 'customer', jsonb_build_object(
        'order_item_id', v_order_item.id, 'quantity', v_quantity
      ));
    END IF;
  END LOOP;

  SELECT COALESCE(SUM(line_total) FILTER (WHERE status NOT IN ('cancelled', 'unavailable')), 0)
  INTO v_new_subtotal
  FROM order_items
  WHERE order_id = v_order.id;

  SELECT CASE WHEN tax_enabled THEN tax_percentage ELSE 0 END,
         CASE WHEN service_charge_enabled THEN service_charge_percentage ELSE 0 END
  INTO v_tax_pct, v_sc_pct
  FROM restaurant_settings
  WHERE restaurant_id = v_order.restaurant_id;

  v_tax := ROUND(v_new_subtotal * v_tax_pct / 100, 2);
  v_service_charge := ROUND(v_new_subtotal * v_sc_pct / 100, 2);

  UPDATE orders
  SET subtotal = v_new_subtotal,
      tax = v_tax,
      service_charge = v_service_charge,
      total = v_new_subtotal + v_tax + v_service_charge,
      updated_at = NOW()
  WHERE id = v_order.id;

  IF v_order.customer_id IS NOT NULL THEN
    UPDATE customers
    SET total_spent = GREATEST(0, total_spent + ((v_new_subtotal + v_tax + v_service_charge) - v_old_total)),
        updated_at = NOW()
    WHERE id = v_order.customer_id;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'order_token', p_order_token,
    'subtotal', v_new_subtotal,
    'tax', v_tax,
    'service_charge', v_service_charge,
    'total', v_new_subtotal + v_tax + v_service_charge
  );
END;
$$;

CREATE OR REPLACE FUNCTION add_items_to_order(
  p_order_token TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_item JSONB;
  v_menu_item menu_items%ROWTYPE;
  v_addon menu_addons%ROWTYPE;
  v_order_item_id UUID;
  v_variant JSONB;
  v_addon_id UUID;
  v_modifier_price DECIMAL(10,2);
  v_item_total DECIMAL(10,2);
  v_quantity INTEGER;
  v_old_total DECIMAL(10,2);
  v_new_subtotal DECIMAL(10,2);
  v_tax DECIMAL(10,2);
  v_service_charge DECIMAL(10,2);
  v_tax_pct DECIMAL(5,2) := 0;
  v_sc_pct DECIMAL(5,2) := 0;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('error', 'Add at least one item');
  END IF;

  SELECT * INTO v_order
  FROM orders
  WHERE order_token = p_order_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;

  IF v_order.status IN ('completed', 'cancelled', 'rejected') THEN
    RETURN jsonb_build_object('error', 'This order is already completed');
  END IF;

  v_old_total := v_order.total;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := NULLIF(v_item->>'quantity', '')::INTEGER;
    IF v_quantity IS NULL OR v_quantity < 1 OR v_quantity > 200 THEN
      RETURN jsonb_build_object('error', 'Invalid item quantity');
    END IF;

    SELECT mi.* INTO v_menu_item
    FROM menu_items mi
    JOIN menu_categories mc ON mc.id = mi.category_id
    WHERE mi.id = (v_item->>'menu_item_id')::UUID
      AND mi.restaurant_id = v_order.restaurant_id
      AND mi.is_active = TRUE
      AND mi.is_available = TRUE
      AND mc.is_active = TRUE
      AND mc.is_available = TRUE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Menu item is unavailable');
    END IF;

    IF EXISTS (
      SELECT 1
      FROM menu_item_variants miv
      WHERE miv.menu_item_id = v_menu_item.id
        AND miv.is_required = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(v_item->'variant_selections', '[]'::JSONB)) selected
          WHERE selected->>'variant_name' = miv.name
        )
    ) THEN
      RETURN jsonb_build_object('error', 'A required option is missing for ' || v_menu_item.name);
    END IF;

    v_order_item_id := gen_random_uuid();
    v_item_total := v_menu_item.base_price * v_quantity;

    INSERT INTO order_items (
      id, order_id, menu_item_id, item_name_snapshot, item_description_snapshot,
      unit_price_snapshot, quantity, line_total, special_instructions, added_by_actor_type
    ) VALUES (
      v_order_item_id, v_order.id, v_menu_item.id, v_menu_item.name, v_menu_item.description,
      v_menu_item.base_price, v_quantity, v_item_total,
      NULLIF(BTRIM(v_item->>'special_instructions'), ''), 'customer'
    );

    FOR v_variant IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'variant_selections', '[]'::JSONB))
    LOOP
      SELECT COALESCE((option_data->>'price_delta')::DECIMAL, 0)
      INTO v_modifier_price
      FROM menu_item_variants miv, jsonb_array_elements(miv.options) option_data
      WHERE miv.menu_item_id = v_menu_item.id
        AND miv.name = v_variant->>'variant_name'
        AND option_data->>'name' = v_variant->>'option_name'
      LIMIT 1;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Invalid option for ' || v_menu_item.name);
      END IF;

      INSERT INTO order_item_modifiers (
        order_item_id, modifier_type, modifier_name_snapshot, option_name_snapshot, price_snapshot
      ) VALUES (
        v_order_item_id, 'variant', v_variant->>'variant_name', v_variant->>'option_name', v_modifier_price
      );
      v_item_total := v_item_total + v_modifier_price * v_quantity;
    END LOOP;

    FOR v_addon_id IN
      SELECT (addon_id)::UUID
      FROM jsonb_array_elements_text(COALESCE(v_item->'addon_ids', '[]'::JSONB)) addon_id
    LOOP
      SELECT * INTO v_addon
      FROM menu_addons
      WHERE id = v_addon_id
        AND restaurant_id = v_order.restaurant_id
        AND is_active = TRUE
        AND (menu_item_id IS NULL OR menu_item_id = v_menu_item.id);

      IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Invalid add-on for ' || v_menu_item.name);
      END IF;

      INSERT INTO order_item_modifiers (
        order_item_id, modifier_type, modifier_name_snapshot, option_name_snapshot, price_snapshot
      ) VALUES (v_order_item_id, 'addon', v_addon.name, NULL, v_addon.price);
      v_item_total := v_item_total + v_addon.price * v_quantity;
    END LOOP;

    UPDATE order_items SET line_total = ROUND(v_item_total, 2) WHERE id = v_order_item_id;

    INSERT INTO order_events (order_id, event_type, actor_type, metadata)
    VALUES (v_order.id, 'item_added', 'customer', jsonb_build_object(
      'order_item_id', v_order_item_id, 'menu_item_id', v_menu_item.id,
      'quantity', v_quantity, 'item_name', v_menu_item.name
    ));
  END LOOP;

  SELECT COALESCE(SUM(line_total) FILTER (WHERE status NOT IN ('cancelled', 'unavailable')), 0)
  INTO v_new_subtotal
  FROM order_items
  WHERE order_id = v_order.id;

  SELECT CASE WHEN tax_enabled THEN tax_percentage ELSE 0 END,
         CASE WHEN service_charge_enabled THEN service_charge_percentage ELSE 0 END
  INTO v_tax_pct, v_sc_pct
  FROM restaurant_settings
  WHERE restaurant_id = v_order.restaurant_id;

  v_tax := ROUND(v_new_subtotal * v_tax_pct / 100, 2);
  v_service_charge := ROUND(v_new_subtotal * v_sc_pct / 100, 2);

  UPDATE orders
  SET subtotal = v_new_subtotal,
      tax = v_tax,
      service_charge = v_service_charge,
      total = v_new_subtotal + v_tax + v_service_charge,
      updated_at = NOW()
  WHERE id = v_order.id;

  IF v_order.customer_id IS NOT NULL THEN
    UPDATE customers
    SET total_spent = GREATEST(0, total_spent + ((v_new_subtotal + v_tax + v_service_charge) - v_old_total)),
        updated_at = NOW()
    WHERE id = v_order.customer_id;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'order_token', p_order_token,
    'subtotal', v_new_subtotal,
    'tax', v_tax,
    'service_charge', v_service_charge,
    'total', v_new_subtotal + v_tax + v_service_charge
  );
END;
$$;

REVOKE ALL ON FUNCTION update_customer_order(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION add_items_to_order(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_customer_order(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_items_to_order(TEXT, JSONB) TO anon, authenticated;
