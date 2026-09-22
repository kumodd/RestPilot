-- ============================================================
-- RestPilot Migration 019: Notification center and reporting RPCs
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'payments'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payments;
  END IF;
END $$;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'in_app',
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

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
    WHEN 'payment_received' THEN
      v_roles := ARRAY['cashier', 'manager'];
      v_title := 'Payment received';
      v_body := 'A payment was recorded for order #' || v_order.order_number || '.';
      v_type := 'payment_received';
    WHEN 'bill_requested' THEN
      v_roles := ARRAY['cashier', 'manager'];
      v_title := 'Bill requested';
      v_body := v_table_label || ' requested the bill for order #' || v_order.order_number || '.';
      v_type := 'bill_requested';
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
      v_type, v_url, jsonb_build_object('event_id', NEW.id, 'branch_id', v_order.branch_id), NOW()
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

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS JSONB AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = COALESCE(read_at, NOW())
  WHERE id = p_notification_id AND recipient_id = auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Notification not found'); END IF;
  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_branch_report(
  p_branch_id UUID,
  p_from TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_to TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  v_restaurant_id UUID;
  v_orders INTEGER;
  v_completed INTEGER;
  v_sales DECIMAL(12,2);
  v_aov DECIMAL(12,2);
  v_payments DECIMAL(12,2);
  v_top_items JSONB;
  v_daily JSONB;
BEGIN
  SELECT restaurant_id INTO v_restaurant_id FROM branches WHERE id = p_branch_id AND is_active = TRUE;
  IF v_restaurant_id IS NULL OR NOT has_branch_access(v_restaurant_id, p_branch_id) THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT COUNT(*)::INTEGER,
         COUNT(*) FILTER (WHERE status = 'completed')::INTEGER,
         COALESCE(SUM(total) FILTER (WHERE status NOT IN ('cancelled', 'rejected')), 0)::DECIMAL,
         COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0)::DECIMAL
  INTO v_orders, v_completed, v_sales, v_payments
  FROM orders
  WHERE branch_id = p_branch_id AND created_at >= p_from AND created_at < p_to;

  v_aov := CASE WHEN v_completed = 0 THEN 0 ELSE ROUND(v_payments / v_completed, 2) END;

  SELECT COALESCE(jsonb_agg(row_to_json(x) ORDER BY x.revenue DESC), '[]'::jsonb)
  INTO v_top_items
  FROM (
    SELECT oi.item_name_snapshot AS item_name,
           SUM(oi.quantity)::INTEGER AS quantity,
           ROUND(SUM(oi.line_total), 2) AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.branch_id = p_branch_id
      AND o.status = 'completed'
      AND o.created_at >= p_from AND o.created_at < p_to
    GROUP BY oi.item_name_snapshot
    ORDER BY revenue DESC
    LIMIT 10
  ) x;

  SELECT COALESCE(jsonb_agg(row_to_json(x) ORDER BY x.day), '[]'::jsonb)
  INTO v_daily
  FROM (
    SELECT DATE(o.created_at) AS day,
           COUNT(*)::INTEGER AS orders,
           ROUND(COALESCE(SUM(o.total) FILTER (WHERE o.status = 'completed'), 0), 2) AS revenue
    FROM orders o
    WHERE o.branch_id = p_branch_id AND o.created_at >= p_from AND o.created_at < p_to
    GROUP BY DATE(o.created_at)
  ) x;

  RETURN jsonb_build_object(
    'orders', v_orders,
    'completed_orders', v_completed,
    'sales', v_sales,
    'paid_sales', v_payments,
    'average_order_value', v_aov,
    'top_items', v_top_items,
    'daily', v_daily,
    'from', p_from,
    'to', p_to
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_branch_report(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
