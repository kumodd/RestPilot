-- ============================================================
-- RestPilot Migration 021: Customer table service requests
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('waiter', 'water', 'cutlery', 'cleaning')),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'acknowledged', 'completed', 'cancelled')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customer_service_requests_branch_status
  ON customer_service_requests (branch_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_service_requests_active_table_type
  ON customer_service_requests (table_id, request_type)
  WHERE status IN ('requested', 'acknowledged');

ALTER TABLE customer_service_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION create_customer_service_request(
  p_order_token TEXT,
  p_request_type TEXT,
  p_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_existing customer_service_requests%ROWTYPE;
  v_request customer_service_requests%ROWTYPE;
  v_label TEXT;
  v_staff RECORD;
BEGIN
  IF p_request_type IS NULL OR p_request_type NOT IN ('waiter', 'water', 'cutlery', 'cleaning') THEN
    RETURN jsonb_build_object('error', 'Unsupported service request');
  END IF;

  SELECT * INTO v_order
  FROM orders
  WHERE order_token = p_order_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;

  IF v_order.status IN ('completed', 'cancelled', 'rejected') THEN
    RETURN jsonb_build_object('error', 'This order is already closed');
  END IF;

  SELECT * INTO v_existing
  FROM customer_service_requests
  WHERE table_id = v_order.table_id
    AND request_type = p_request_type
    AND status IN ('requested', 'acknowledged')
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'request_id', v_existing.id,
      'status', v_existing.status,
      'already_requested', TRUE
    );
  END IF;

  INSERT INTO customer_service_requests (
    restaurant_id, branch_id, table_id, order_id, request_type, message
  ) VALUES (
    v_order.restaurant_id, v_order.branch_id, v_order.table_id, v_order.id,
    p_request_type, NULLIF(BTRIM(p_message), '')
  )
  RETURNING * INTO v_request;

  SELECT COALESCE(display_name, 'Table ' || table_number)
  INTO v_label
  FROM restaurant_tables
  WHERE id = v_order.table_id;

  FOR v_staff IN
    SELECT sm.profile_id
    FROM staff_members sm
    WHERE sm.restaurant_id = v_order.restaurant_id
      AND sm.is_active = TRUE
      AND (sm.branch_id IS NULL OR sm.branch_id = v_order.branch_id)
      AND sm.role::TEXT IN ('waiter', 'manager')
      AND NOT EXISTS (
        SELECT 1
        FROM notification_preferences np
        WHERE np.profile_id = sm.profile_id
          AND np.restaurant_id = v_order.restaurant_id
          AND np.event_type = 'service_request'
          AND np.in_app_enabled = FALSE
      )
  LOOP
    INSERT INTO notifications (
      recipient_id, restaurant_id, order_id, title, body, notification_type,
      action_url, metadata, delivered_at
    ) VALUES (
      v_staff.profile_id,
      v_order.restaurant_id,
      v_order.id,
      'Table service request',
      v_label || ' requested ' || REPLACE(p_request_type, '_', ' ') || '.',
      'service_request',
      '/dashboard/' || v_order.restaurant_id || '/' || v_order.branch_id || '/orders?order=' || v_order.id,
      jsonb_build_object(
        'request_id', v_request.id,
        'request_type', p_request_type,
        'table_id', v_order.table_id,
        'branch_id', v_order.branch_id
      ),
      NOW()
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'request_id', v_request.id,
    'status', v_request.status,
    'already_requested', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION create_customer_service_request(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_customer_service_request(TEXT, TEXT, TEXT) TO anon, authenticated;
