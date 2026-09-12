-- ============================================================
-- RestPilot Multi-Tenant Restaurant Platform
-- Migration 002: Row Level Security (RLS) Policies
-- ============================================================
-- 
-- SECURITY MODEL:
--   - platform_admin  → full access to everything
--   - owner           → full access to their restaurants & descendants
--   - manager         → access to assigned restaurant/branch
--   - waiter          → access to assigned branch orders (read + limited write)
--   - chef            → access to assigned branch confirmed orders (read + status update)
--   - customer        → public menu read + own order tracking via order_token
--
-- Customers do NOT have Supabase auth accounts.
-- They access orders via a secure order_token.
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiter_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiter_suggestion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiter_suggestion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current user owns a specific restaurant
CREATE OR REPLACE FUNCTION owns_restaurant(p_restaurant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM owners o
    JOIN restaurants r ON r.owner_id = o.id
    WHERE o.profile_id = auth.uid()
      AND r.id = p_restaurant_id
      AND r.is_active = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get all restaurant IDs the current user owns
CREATE OR REPLACE FUNCTION my_restaurant_ids()
RETURNS SETOF UUID AS $$
  SELECT r.id
  FROM owners o
  JOIN restaurants r ON r.owner_id = o.id
  WHERE o.profile_id = auth.uid()
    AND r.is_active = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get all restaurant IDs the current user is staff of
CREATE OR REPLACE FUNCTION my_staff_restaurant_ids()
RETURNS SETOF UUID AS $$
  SELECT DISTINCT restaurant_id
  FROM staff_members
  WHERE profile_id = auth.uid()
    AND is_active = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get all branch IDs the current user is staff of
CREATE OR REPLACE FUNCTION my_staff_branch_ids()
RETURNS SETOF UUID AS $$
  SELECT DISTINCT branch_id
  FROM staff_members
  WHERE profile_id = auth.uid()
    AND is_active = TRUE
    AND branch_id IS NOT NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user has staff access to a restaurant (owner or staff member)
CREATE OR REPLACE FUNCTION has_restaurant_access(p_restaurant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT 
    is_platform_admin()
    OR owns_restaurant(p_restaurant_id)
    OR EXISTS (
      SELECT 1 FROM staff_members
      WHERE profile_id = auth.uid()
        AND restaurant_id = p_restaurant_id
        AND is_active = TRUE
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- PROFILES
-- ============================================================

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_platform_admin());

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- OWNERS
-- ============================================================

CREATE POLICY "owners_select"
  ON owners FOR SELECT
  USING (
    is_platform_admin()
    OR profile_id = auth.uid()
  );

CREATE POLICY "owners_update_own"
  ON owners FOR UPDATE
  USING (profile_id = auth.uid() OR is_platform_admin());

CREATE POLICY "owners_insert"
  ON owners FOR INSERT
  WITH CHECK (profile_id = auth.uid() OR is_platform_admin());

-- ============================================================
-- RESTAURANTS
-- ============================================================

CREATE POLICY "restaurants_select"
  ON restaurants FOR SELECT
  USING (
    is_platform_admin()
    OR owns_restaurant(id)
    OR id IN (SELECT my_staff_restaurant_ids())
  );

CREATE POLICY "restaurants_insert"
  ON restaurants FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM owners WHERE profile_id = auth.uid() AND id = owner_id
    )
  );

CREATE POLICY "restaurants_update"
  ON restaurants FOR UPDATE
  USING (
    is_platform_admin()
    OR owns_restaurant(id)
    -- managers can update limited fields (enforced at app level)
    OR EXISTS (
      SELECT 1 FROM staff_members
      WHERE profile_id = auth.uid()
        AND restaurant_id = id
        AND role = 'manager'
        AND is_active = TRUE
    )
  );

CREATE POLICY "restaurants_delete"
  ON restaurants FOR DELETE
  USING (is_platform_admin() OR owns_restaurant(id));

-- ============================================================
-- BRANCHES
-- ============================================================

CREATE POLICY "branches_select"
  ON branches FOR SELECT
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR restaurant_id IN (SELECT my_staff_restaurant_ids())
  );

CREATE POLICY "branches_insert"
  ON branches FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
  );

CREATE POLICY "branches_update"
  ON branches FOR UPDATE
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR EXISTS (
      SELECT 1 FROM staff_members
      WHERE profile_id = auth.uid()
        AND restaurant_id = branches.restaurant_id
        AND role = 'manager'
        AND is_active = TRUE
    )
  );

CREATE POLICY "branches_delete"
  ON branches FOR DELETE
  USING (is_platform_admin() OR owns_restaurant(restaurant_id));

-- ============================================================
-- STAFF MEMBERS
-- ============================================================

CREATE POLICY "staff_members_select"
  ON staff_members FOR SELECT
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM staff_members sm
      WHERE sm.profile_id = auth.uid()
        AND sm.restaurant_id = staff_members.restaurant_id
        AND sm.role IN ('manager')
        AND sm.is_active = TRUE
    )
  );

CREATE POLICY "staff_members_insert"
  ON staff_members FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR EXISTS (
      SELECT 1 FROM staff_members sm
      WHERE sm.profile_id = auth.uid()
        AND sm.restaurant_id = restaurant_id
        AND sm.role = 'manager'
        AND sm.is_active = TRUE
    )
  );

CREATE POLICY "staff_members_update"
  ON staff_members FOR UPDATE
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR profile_id = auth.uid() -- staff can update their own profile info
  );

CREATE POLICY "staff_members_delete"
  ON staff_members FOR DELETE
  USING (is_platform_admin() OR owns_restaurant(restaurant_id));

-- ============================================================
-- RESTAURANT & BRANCH SETTINGS
-- ============================================================

CREATE POLICY "restaurant_settings_select"
  ON restaurant_settings FOR SELECT
  USING (has_restaurant_access(restaurant_id));

CREATE POLICY "restaurant_settings_modify"
  ON restaurant_settings FOR ALL
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
  );

CREATE POLICY "branch_settings_select"
  ON branch_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM branches b
      WHERE b.id = branch_id
        AND has_restaurant_access(b.restaurant_id)
    )
  );

CREATE POLICY "branch_settings_modify"
  ON branch_settings FOR ALL
  USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM branches b
      WHERE b.id = branch_id
        AND owns_restaurant(b.restaurant_id)
    )
  );

-- ============================================================
-- RESTAURANT TABLES
-- ============================================================

-- Staff access their branch/restaurant tables
CREATE POLICY "restaurant_tables_select"
  ON restaurant_tables FOR SELECT
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR restaurant_id IN (SELECT my_staff_restaurant_ids())
  );

-- Public: allow resolving table by QR (via Edge Function / SECURITY DEFINER)
-- The QR resolution happens server-side, not via direct table access

CREATE POLICY "restaurant_tables_insert"
  ON restaurant_tables FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR EXISTS (
      SELECT 1 FROM staff_members
      WHERE profile_id = auth.uid()
        AND restaurant_id = restaurant_tables.restaurant_id
        AND role = 'manager'
        AND is_active = TRUE
    )
  );

CREATE POLICY "restaurant_tables_update"
  ON restaurant_tables FOR UPDATE
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR EXISTS (
      SELECT 1 FROM staff_members
      WHERE profile_id = auth.uid()
        AND restaurant_id = restaurant_tables.restaurant_id
        AND role IN ('manager', 'waiter')
        AND is_active = TRUE
    )
  );

-- ============================================================
-- QR CODES
-- ============================================================

CREATE POLICY "qr_codes_select"
  ON qr_codes FOR SELECT
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR restaurant_id IN (SELECT my_staff_restaurant_ids())
  );

CREATE POLICY "qr_codes_modify"
  ON qr_codes FOR ALL
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
  );

-- ============================================================
-- MENU (public read for active items, write restricted)
-- ============================================================

-- Menu categories: public read if active
CREATE POLICY "menu_categories_public_select"
  ON menu_categories FOR SELECT
  USING (
    is_active = TRUE -- public can read active categories
    OR is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR restaurant_id IN (SELECT my_staff_restaurant_ids())
  );

CREATE POLICY "menu_categories_modify"
  ON menu_categories FOR ALL
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR EXISTS (
      SELECT 1 FROM staff_members
      WHERE profile_id = auth.uid()
        AND restaurant_id = menu_categories.restaurant_id
        AND role IN ('manager')
        AND is_active = TRUE
    )
  );

-- Menu subcategories: public read
CREATE POLICY "menu_subcategories_public_select"
  ON menu_subcategories FOR SELECT
  USING (
    is_active = TRUE
    OR is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR restaurant_id IN (SELECT my_staff_restaurant_ids())
  );

CREATE POLICY "menu_subcategories_modify"
  ON menu_subcategories FOR ALL
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
  );

-- Menu items: public read for available active items
CREATE POLICY "menu_items_public_select"
  ON menu_items FOR SELECT
  USING (
    (is_active = TRUE AND is_available = TRUE)
    OR is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR restaurant_id IN (SELECT my_staff_restaurant_ids())
  );

CREATE POLICY "menu_items_modify"
  ON menu_items FOR ALL
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR EXISTS (
      SELECT 1 FROM staff_members
      WHERE profile_id = auth.uid()
        AND restaurant_id = menu_items.restaurant_id
        AND role IN ('manager')
        AND is_active = TRUE
    )
  );

-- Variants: public read
CREATE POLICY "menu_item_variants_public_select"
  ON menu_item_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM menu_items mi
      WHERE mi.id = menu_item_id
        AND (mi.is_active OR is_platform_admin() OR owns_restaurant(mi.restaurant_id))
    )
  );

CREATE POLICY "menu_item_variants_modify"
  ON menu_item_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM menu_items mi
      WHERE mi.id = menu_item_id
        AND (is_platform_admin() OR owns_restaurant(mi.restaurant_id))
    )
  );

-- Addons: public read
CREATE POLICY "menu_addons_public_select"
  ON menu_addons FOR SELECT
  USING (
    is_active = TRUE
    OR is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR restaurant_id IN (SELECT my_staff_restaurant_ids())
  );

CREATE POLICY "menu_addons_modify"
  ON menu_addons FOR ALL
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
  );

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE POLICY "customers_select"
  ON customers FOR SELECT
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR EXISTS (
      SELECT 1 FROM staff_members
      WHERE profile_id = auth.uid()
        AND restaurant_id = customers.restaurant_id
        AND role IN ('manager', 'waiter')
        AND is_active = TRUE
    )
  );

-- Customers are created via Edge Function (SECURITY DEFINER)
-- No direct client insert
CREATE POLICY "customers_insert_system"
  ON customers FOR INSERT
  WITH CHECK (FALSE); -- Only via SECURITY DEFINER functions

CREATE POLICY "customers_update"
  ON customers FOR UPDATE
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
  );

-- ============================================================
-- TABLE SESSIONS
-- ============================================================

CREATE POLICY "table_sessions_select"
  ON table_sessions FOR SELECT
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR restaurant_id IN (SELECT my_staff_restaurant_ids())
  );

-- ============================================================
-- ORDERS
-- ============================================================

-- Staff can see orders for their restaurant/branch
-- Customers can see their own order via order_token (handled at app level via Edge Function)
CREATE POLICY "orders_staff_select"
  ON orders FOR SELECT
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR (
      restaurant_id IN (SELECT my_staff_restaurant_ids())
      AND (
        branch_id IN (SELECT my_staff_branch_ids())
        OR NOT EXISTS (SELECT 1 FROM my_staff_branch_ids()) -- if no specific branch, see all
      )
    )
  );

-- Orders are created only via Edge Function
CREATE POLICY "orders_insert_deny_direct"
  ON orders FOR INSERT
  WITH CHECK (FALSE); -- Only via SECURITY DEFINER Edge Functions

-- Order status updates by authorized staff
CREATE POLICY "orders_update_staff"
  ON orders FOR UPDATE
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR EXISTS (
      SELECT 1 FROM staff_members
      WHERE profile_id = auth.uid()
        AND restaurant_id = orders.restaurant_id
        AND is_active = TRUE
    )
  );

-- ============================================================
-- ORDER ITEMS
-- ============================================================

CREATE POLICY "order_items_staff_select"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (
          is_platform_admin()
          OR owns_restaurant(o.restaurant_id)
          OR o.restaurant_id IN (SELECT my_staff_restaurant_ids())
        )
    )
  );

CREATE POLICY "order_items_insert_deny"
  ON order_items FOR INSERT
  WITH CHECK (FALSE); -- Only via Edge Functions

CREATE POLICY "order_items_update_staff"
  ON order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (
          is_platform_admin()
          OR owns_restaurant(o.restaurant_id)
          OR EXISTS (
            SELECT 1 FROM staff_members
            WHERE profile_id = auth.uid()
              AND restaurant_id = o.restaurant_id
              AND is_active = TRUE
          )
        )
    )
  );

-- ============================================================
-- ORDER ITEM MODIFIERS
-- ============================================================

CREATE POLICY "order_item_modifiers_staff_select"
  ON order_item_modifiers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_id
        AND (
          is_platform_admin()
          OR owns_restaurant(o.restaurant_id)
          OR o.restaurant_id IN (SELECT my_staff_restaurant_ids())
        )
    )
  );

-- ============================================================
-- ORDER EVENTS (append-only audit trail)
-- ============================================================

CREATE POLICY "order_events_staff_select"
  ON order_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (
          is_platform_admin()
          OR owns_restaurant(o.restaurant_id)
          OR o.restaurant_id IN (SELECT my_staff_restaurant_ids())
        )
    )
  );

-- Events are only inserted via Edge Functions / SECURITY DEFINER
CREATE POLICY "order_events_insert_deny"
  ON order_events FOR INSERT
  WITH CHECK (FALSE);

-- Events are NEVER updated or deleted
-- (No UPDATE/DELETE policies granted)

-- ============================================================
-- WAITER SUGGESTIONS
-- ============================================================

CREATE POLICY "waiter_suggestions_select"
  ON waiter_suggestions FOR SELECT
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR restaurant_id IN (SELECT my_staff_restaurant_ids())
  );

CREATE POLICY "waiter_suggestions_modify"
  ON waiter_suggestions FOR ALL
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR EXISTS (
      SELECT 1 FROM staff_members
      WHERE profile_id = auth.uid()
        AND restaurant_id = waiter_suggestions.restaurant_id
        AND role = 'manager'
        AND is_active = TRUE
    )
  );

CREATE POLICY "waiter_suggestion_rules_select"
  ON waiter_suggestion_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM waiter_suggestions ws
      WHERE ws.id = suggestion_id
        AND (
          is_platform_admin()
          OR owns_restaurant(ws.restaurant_id)
          OR ws.restaurant_id IN (SELECT my_staff_restaurant_ids())
        )
    )
  );

CREATE POLICY "waiter_suggestion_rules_modify"
  ON waiter_suggestion_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM waiter_suggestions ws
      WHERE ws.id = suggestion_id
        AND (is_platform_admin() OR owns_restaurant(ws.restaurant_id))
    )
  );

CREATE POLICY "waiter_suggestion_events_select"
  ON waiter_suggestion_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM waiter_suggestions ws
      WHERE ws.id = suggestion_id
        AND (
          is_platform_admin()
          OR owns_restaurant(ws.restaurant_id)
          OR ws.restaurant_id IN (SELECT my_staff_restaurant_ids())
        )
    )
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

-- Staff only see their own notifications
CREATE POLICY "notifications_own_select"
  ON notifications FOR SELECT
  USING (
    recipient_id = auth.uid()
    OR is_platform_admin()
    OR owns_restaurant(restaurant_id)
  );

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (recipient_id = auth.uid() OR is_platform_admin());

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE POLICY "payments_select"
  ON payments FOR SELECT
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR EXISTS (
      SELECT 1 FROM staff_members
      WHERE profile_id = auth.uid()
        AND restaurant_id = payments.restaurant_id
        AND role IN ('manager', 'cashier')
        AND is_active = TRUE
    )
  );

CREATE POLICY "payments_insert"
  ON payments FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR EXISTS (
      SELECT 1 FROM staff_members
      WHERE profile_id = auth.uid()
        AND restaurant_id = payments.restaurant_id
        AND role IN ('manager', 'cashier', 'waiter')
        AND is_active = TRUE
    )
  );

CREATE POLICY "payments_update"
  ON payments FOR UPDATE
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR EXISTS (
      SELECT 1 FROM staff_members
      WHERE profile_id = auth.uid()
        AND restaurant_id = payments.restaurant_id
        AND role IN ('manager', 'cashier')
        AND is_active = TRUE
    )
  );
