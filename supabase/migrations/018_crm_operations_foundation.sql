-- ============================================================
-- RestPilot Migration 018: CRM, guest experience and operations
-- ============================================================

-- The linked project exposes gen_random_uuid() but not pgcrypto's
-- gen_random_bytes(). Keep token generation available to the older 017
-- functions and to this migration without requiring an extension install.
CREATE OR REPLACE FUNCTION public.gen_random_bytes(p_length INTEGER)
RETURNS BYTEA
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hex TEXT := '';
BEGIN
  IF p_length IS NULL OR p_length < 1 OR p_length > 1024 THEN
    RAISE EXCEPTION 'gen_random_bytes length must be between 1 and 1024';
  END IF;

  WHILE length(v_hex) < p_length * 2 LOOP
    v_hex := v_hex || replace(gen_random_uuid()::TEXT, '-', '');
  END LOOP;

  RETURN decode(substr(v_hex, 1, p_length * 2), 'hex');
END;
$$;

REVOKE ALL ON FUNCTION public.gen_random_bytes(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gen_random_bytes(INTEGER) TO authenticated;

-- ------------------------------------------------------------
-- Customer 360 and communication preferences
-- ------------------------------------------------------------

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS total_visits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_tier TEXT NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_restaurant_phone
  ON customers (restaurant_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_restaurant_last_order
  ON customers (restaurant_id, last_order_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_restaurant_tags
  ON customers USING GIN (tags);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, restaurant_id, event_type)
);

-- ------------------------------------------------------------
-- Reservations, feedback, loyalty and campaigns
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  guest_email TEXT,
  party_size INTEGER NOT NULL CHECK (party_size > 0 AND party_size <= 100),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')),
  source TEXT NOT NULL DEFAULT 'dashboard',
  confirmation_code TEXT NOT NULL DEFAULT encode(gen_random_bytes(5), 'hex'),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_branch_time
  ON reservations (branch_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_reservations_customer
  ON reservations (customer_id, starts_at DESC);

CREATE TABLE IF NOT EXISTS customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  category TEXT,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_review', 'resolved', 'archived')),
  response TEXT,
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
  tier TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, customer_id)
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  points INTEGER NOT NULL CHECK (points <> 0),
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app'
    CHECK (channel IN ('in_app', 'email', 'sms', 'whatsapp', 'push')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
  audience_filter JSONB NOT NULL DEFAULT '{}',
  subject TEXT,
  message TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'unsubscribed')),
  provider_reference TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, customer_id)
);

-- ------------------------------------------------------------
-- Inventory, recipes and purchasing foundation
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  unit TEXT NOT NULL DEFAULT 'unit',
  current_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(12,3) NOT NULL DEFAULT 0,
  cost_per_unit DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_branch_stock
  ON inventory_items (branch_id, current_stock, reorder_level);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL
    CHECK (movement_type IN ('opening', 'purchase', 'sale', 'waste', 'adjustment', 'transfer_in', 'transfer_out')),
  quantity DECIMAL(12,3) NOT NULL CHECK (quantity <> 0),
  unit_cost DECIMAL(12,2),
  reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  yield_quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(menu_item_id)
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'unit',
  UNIQUE(recipe_id, inventory_item_id)
);

-- ------------------------------------------------------------
-- Workforce and integrations foundation
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'confirmed', 'started', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  clocked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clocked_out_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'dashboard',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (clocked_out_at IS NULL OR clocked_out_at > clocked_in_at)
);

CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  public_config JSONB NOT NULL DEFAULT '{}',
  secret_reference TEXT,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, provider)
);

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'notification_preferences', 'reservations', 'customer_feedback',
    'loyalty_accounts', 'campaigns', 'vendors', 'inventory_items',
    'recipes', 'staff_shifts', 'integration_connections'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS handle_%s_updated_at ON %I; CREATE TRIGGER handle_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION handle_updated_at()',
      v_table, v_table, v_table, v_table
    );
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- Secure CRM and operations functions
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION upsert_customer_profile(
  p_restaurant_id UUID,
  p_customer_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_marketing_consent BOOLEAN DEFAULT FALSE,
  p_sms_consent BOOLEAN DEFAULT FALSE,
  p_tags TEXT[] DEFAULT '{}',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_id UUID := p_customer_id;
  v_customer customers%ROWTYPE;
BEGIN
  IF NOT is_restaurant_manager(p_restaurant_id) THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  IF v_id IS NULL AND NULLIF(BTRIM(p_phone), '') IS NOT NULL THEN
    SELECT id INTO v_id FROM customers
    WHERE restaurant_id = p_restaurant_id AND phone = BTRIM(p_phone)
    ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO customers (
      restaurant_id, name, phone, email, marketing_consent, sms_consent,
      tags, notes, last_seen_at
    ) VALUES (
      p_restaurant_id, NULLIF(BTRIM(p_name), ''), NULLIF(BTRIM(p_phone), ''),
      NULLIF(LOWER(BTRIM(p_email)), ''), COALESCE(p_marketing_consent, FALSE),
      COALESCE(p_sms_consent, FALSE), COALESCE(p_tags, '{}'), p_notes, NOW()
    ) RETURNING * INTO v_customer;
  ELSE
    UPDATE customers SET
      name = COALESCE(NULLIF(BTRIM(p_name), ''), name),
      phone = COALESCE(NULLIF(BTRIM(p_phone), ''), phone),
      email = COALESCE(NULLIF(LOWER(BTRIM(p_email)), ''), email),
      marketing_consent = COALESCE(p_marketing_consent, marketing_consent),
      sms_consent = COALESCE(p_sms_consent, sms_consent),
      tags = COALESCE(p_tags, tags),
      notes = COALESCE(p_notes, notes),
      last_seen_at = NOW()
    WHERE id = v_id AND restaurant_id = p_restaurant_id
    RETURNING * INTO v_customer;
  END IF;

  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Customer not found'); END IF;
  RETURN to_jsonb(v_customer);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION create_reservation(
  p_restaurant_id UUID,
  p_branch_id UUID,
  p_guest_name TEXT,
  p_guest_phone TEXT,
  p_guest_email TEXT,
  p_party_size INTEGER,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_reservation reservations%ROWTYPE;
BEGIN
  IF NOT is_restaurant_manager(p_restaurant_id)
     OR NOT has_branch_access(p_restaurant_id, p_branch_id) THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;
  IF NULLIF(BTRIM(p_guest_name), '') IS NULL OR p_party_size < 1 OR p_starts_at IS NULL THEN
    RETURN jsonb_build_object('error', 'Guest name, party size and start time are required');
  END IF;

  INSERT INTO reservations (
    restaurant_id, branch_id, customer_id, guest_name, guest_phone,
    guest_email, party_size, starts_at, ends_at, notes, created_by
  ) VALUES (
    p_restaurant_id, p_branch_id, p_customer_id, BTRIM(p_guest_name),
    NULLIF(BTRIM(p_guest_phone), ''), NULLIF(LOWER(BTRIM(p_guest_email)), ''),
    p_party_size, p_starts_at, p_ends_at, p_notes, auth.uid()
  ) RETURNING * INTO v_reservation;

  RETURN to_jsonb(v_reservation);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION adjust_inventory(
  p_inventory_item_id UUID,
  p_movement_type TEXT,
  p_quantity DECIMAL,
  p_unit_cost DECIMAL DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_item inventory_items%ROWTYPE;
  v_delta DECIMAL(12,3);
  v_movement inventory_movements%ROWTYPE;
BEGIN
  SELECT * INTO v_item FROM inventory_items WHERE id = p_inventory_item_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Inventory item not found'); END IF;
  IF NOT is_restaurant_manager(v_item.restaurant_id)
     OR (v_item.branch_id IS NOT NULL AND NOT has_branch_access(v_item.restaurant_id, v_item.branch_id)) THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;
  IF p_quantity IS NULL OR p_quantity = 0 THEN RETURN jsonb_build_object('error', 'Quantity is required'); END IF;
  IF p_movement_type NOT IN ('opening', 'purchase', 'sale', 'waste', 'adjustment', 'transfer_in', 'transfer_out') THEN
    RETURN jsonb_build_object('error', 'Invalid movement type');
  END IF;

  v_delta := CASE WHEN p_movement_type IN ('sale', 'waste', 'transfer_out') THEN -ABS(p_quantity) ELSE p_quantity END;
  IF v_item.current_stock + v_delta < 0 THEN RETURN jsonb_build_object('error', 'Insufficient stock'); END IF;

  UPDATE inventory_items
  SET current_stock = current_stock + v_delta,
      cost_per_unit = COALESCE(p_unit_cost, cost_per_unit)
  WHERE id = p_inventory_item_id;

  INSERT INTO inventory_movements (
    inventory_item_id, branch_id, movement_type, quantity, unit_cost,
    reference, notes, created_by
  ) VALUES (
    p_inventory_item_id, v_item.branch_id, p_movement_type, v_delta,
    p_unit_cost, p_reference, p_notes, auth.uid()
  ) RETURNING * INTO v_movement;

  RETURN jsonb_build_object('success', TRUE, 'movement', to_jsonb(v_movement));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION submit_customer_feedback(
  p_order_token TEXT,
  p_rating INTEGER,
  p_comment TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_feedback customer_feedback%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE order_token = p_order_token;
  IF NOT FOUND OR v_order.status NOT IN ('served', 'completed') THEN
    RETURN jsonb_build_object('error', 'Order is not eligible for feedback');
  END IF;
  IF p_rating < 1 OR p_rating > 5 THEN RETURN jsonb_build_object('error', 'Rating must be from 1 to 5'); END IF;

  INSERT INTO customer_feedback (
    restaurant_id, branch_id, customer_id, order_id, rating, category, comment
  ) VALUES (
    v_order.restaurant_id, v_order.branch_id, v_order.customer_id, v_order.id,
    p_rating, NULLIF(BTRIM(p_category), ''), NULLIF(BTRIM(p_comment), '')
  ) RETURNING * INTO v_feedback;

  RETURN to_jsonb(v_feedback);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Award a simple, auditable loyalty balance on completed orders. The unique
-- order reference prevents duplicate awards when realtime retries occur.
CREATE OR REPLACE FUNCTION award_loyalty_for_completed_order()
RETURNS TRIGGER AS $$
DECLARE
  v_account loyalty_accounts%ROWTYPE;
  v_points INTEGER;
BEGIN
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.customer_id IS NOT NULL THEN
    INSERT INTO loyalty_accounts (restaurant_id, customer_id)
    VALUES (NEW.restaurant_id, NEW.customer_id)
    ON CONFLICT (restaurant_id, customer_id) DO NOTHING;

    SELECT * INTO v_account FROM loyalty_accounts
    WHERE restaurant_id = NEW.restaurant_id AND customer_id = NEW.customer_id
    FOR UPDATE;

    IF NOT EXISTS (
      SELECT 1 FROM loyalty_transactions
      WHERE account_id = v_account.id AND order_id = NEW.id AND reason = 'order_completed'
    ) THEN
      v_points := GREATEST(FLOOR(NEW.total / 100), 1)::INTEGER;
      UPDATE loyalty_accounts
      SET points_balance = points_balance + v_points,
          lifetime_points = lifetime_points + v_points,
          tier = CASE
            WHEN lifetime_points + v_points >= 5000 THEN 'vip'
            WHEN lifetime_points + v_points >= 1000 THEN 'regular'
            ELSE 'member'
          END
      WHERE id = v_account.id;
      INSERT INTO loyalty_transactions (account_id, order_id, points, reason)
      VALUES (v_account.id, NEW.id, v_points, 'order_completed');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS award_loyalty_on_order_completed ON orders;
CREATE TRIGGER award_loyalty_on_order_completed
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION award_loyalty_for_completed_order();

-- ------------------------------------------------------------
-- RLS for new domain tables
-- ------------------------------------------------------------

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'notification_preferences', 'reservations', 'customer_feedback',
    'loyalty_accounts', 'loyalty_transactions', 'campaigns', 'campaign_recipients',
    'vendors', 'inventory_items', 'inventory_movements', 'recipes', 'recipe_ingredients',
    'staff_shifts', 'staff_attendance', 'integration_connections'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', v_table);
  END LOOP;
END $$;

CREATE POLICY "notification_preferences_own" ON notification_preferences
  FOR ALL USING (profile_id = auth.uid() OR is_platform_admin() OR owns_restaurant(restaurant_id));

CREATE POLICY "reservations_access" ON reservations
  FOR ALL USING (has_branch_access(restaurant_id, branch_id));

CREATE POLICY "feedback_access" ON customer_feedback
  FOR SELECT USING (has_branch_access(restaurant_id, branch_id));

CREATE POLICY "loyalty_access" ON loyalty_accounts
  FOR ALL USING (has_restaurant_access(restaurant_id));
CREATE POLICY "loyalty_transactions_access" ON loyalty_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM loyalty_accounts la
      WHERE la.id = account_id AND has_restaurant_access(la.restaurant_id)
    )
  );

CREATE POLICY "campaigns_manager_access" ON campaigns
  FOR ALL USING (is_restaurant_manager(restaurant_id));
CREATE POLICY "campaign_recipients_manager_access" ON campaign_recipients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM campaigns c WHERE c.id = campaign_id AND is_restaurant_manager(c.restaurant_id))
  );

CREATE POLICY "vendors_manager_access" ON vendors
  FOR ALL USING (is_restaurant_manager(restaurant_id));
CREATE POLICY "inventory_access" ON inventory_items
  FOR ALL USING (has_restaurant_access(restaurant_id));
CREATE POLICY "inventory_movements_access" ON inventory_movements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM inventory_items ii WHERE ii.id = inventory_item_id AND has_restaurant_access(ii.restaurant_id))
  );
CREATE POLICY "recipes_manager_access" ON recipes
  FOR ALL USING (is_restaurant_manager(restaurant_id));
CREATE POLICY "recipe_ingredients_manager_access" ON recipe_ingredients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND is_restaurant_manager(r.restaurant_id))
  );

CREATE POLICY "staff_shifts_manager_access" ON staff_shifts
  FOR ALL USING (is_restaurant_manager(restaurant_id));
CREATE POLICY "staff_attendance_access" ON staff_attendance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM branches b WHERE b.id = branch_id AND has_branch_access(b.restaurant_id, b.id))
  );
CREATE POLICY "integrations_manager_access" ON integration_connections
  FOR ALL USING (is_restaurant_manager(restaurant_id));

-- ------------------------------------------------------------
-- Realtime for guest/operations screens
-- ------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'reservations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'inventory_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION upsert_customer_profile(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, TEXT[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_reservation(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_inventory(UUID, TEXT, DECIMAL, DECIMAL, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_customer_feedback(TEXT, INTEGER, TEXT, TEXT) TO anon, authenticated;
