-- =================================================================================
-- 016_order_notifications.sql
-- Intercepts order_events and generates in-app notifications for staff.
-- =================================================================================

CREATE OR REPLACE FUNCTION process_order_event_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_staff RECORD;
BEGIN
  -- Get the associated order to find branch, table, and assigned waiter
  SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- 1. New Order Placed -> Notify Waiters
  IF NEW.event_type = 'order_placed' THEN
    FOR v_staff IN 
      SELECT profile_id 
      FROM staff_members 
      WHERE branch_id = v_order.branch_id AND role = 'waiter' AND is_active = TRUE
    LOOP
      INSERT INTO notifications (
        recipient_id, restaurant_id, order_id, title, body, notification_type
      ) VALUES (
        v_staff.profile_id, v_order.restaurant_id, v_order.id,
        'New Order Received', 
        'Table ' || COALESCE((SELECT table_number FROM restaurant_tables WHERE id = v_order.table_id), '?') || ' placed a new order.',
        'new_order'
      );
    END LOOP;
  END IF;

  -- 2. Order Ready (Chef finished) -> Notify Assigned Waiter (or all waiters)
  IF NEW.event_type = 'order_ready' THEN
    IF v_order.assigned_waiter_id IS NOT NULL THEN
      -- Notify specific assigned waiter
      INSERT INTO notifications (
        recipient_id, restaurant_id, order_id, title, body, notification_type
      ) VALUES (
        v_order.assigned_waiter_id, v_order.restaurant_id, v_order.id,
        'Order Ready to Serve',
        'Kitchen has prepared the order for Table ' || COALESCE((SELECT table_number FROM restaurant_tables WHERE id = v_order.table_id), '?') || '.',
        'order_ready'
      );
    ELSE
      -- Notify all waiters if unassigned
      FOR v_staff IN 
        SELECT profile_id 
        FROM staff_members 
        WHERE branch_id = v_order.branch_id AND role = 'waiter' AND is_active = TRUE
      LOOP
        INSERT INTO notifications (
          recipient_id, restaurant_id, order_id, title, body, notification_type
        ) VALUES (
          v_staff.profile_id, v_order.restaurant_id, v_order.id,
          'Order Ready to Serve',
          'Kitchen has prepared the order for Table ' || COALESCE((SELECT table_number FROM restaurant_tables WHERE id = v_order.table_id), '?') || '.',
          'order_ready'
        );
      END LOOP;
    END IF;
  END IF;

  -- (Optional: Extend for cashiers when served, etc.)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_order_event_notifications ON order_events;

-- Create trigger
CREATE TRIGGER trg_order_event_notifications
AFTER INSERT ON order_events
FOR EACH ROW
EXECUTE FUNCTION process_order_event_notifications();
