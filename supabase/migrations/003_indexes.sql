-- ============================================================
-- RestPilot Multi-Tenant Restaurant Platform
-- Migration 003: Performance Indexes
-- ============================================================

-- ============================================================
-- PROFILES & OWNERS
-- ============================================================

CREATE INDEX idx_owners_profile_id ON owners(profile_id);
CREATE INDEX idx_owners_subscription_status ON owners(subscription_status);

-- ============================================================
-- RESTAURANTS
-- ============================================================

CREATE INDEX idx_restaurants_owner_id ON restaurants(owner_id);
CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_is_active ON restaurants(is_active) WHERE is_active = TRUE;

-- ============================================================
-- BRANCHES
-- ============================================================

CREATE INDEX idx_branches_restaurant_id ON branches(restaurant_id);
CREATE INDEX idx_branches_is_active ON branches(restaurant_id, is_active) WHERE is_active = TRUE;

-- ============================================================
-- STAFF MEMBERS
-- ============================================================

CREATE INDEX idx_staff_members_profile_id ON staff_members(profile_id);
CREATE INDEX idx_staff_members_restaurant_id ON staff_members(restaurant_id);
CREATE INDEX idx_staff_members_branch_id ON staff_members(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX idx_staff_members_role ON staff_members(restaurant_id, role);
CREATE INDEX idx_staff_members_active ON staff_members(restaurant_id, is_active) WHERE is_active = TRUE;

-- ============================================================
-- RESTAURANT TABLES
-- ============================================================

CREATE INDEX idx_restaurant_tables_branch_id ON restaurant_tables(branch_id);
CREATE INDEX idx_restaurant_tables_restaurant_id ON restaurant_tables(restaurant_id);
CREATE INDEX idx_restaurant_tables_status ON restaurant_tables(branch_id, status);
CREATE INDEX idx_restaurant_tables_active ON restaurant_tables(branch_id, is_active) WHERE is_active = TRUE;

-- ============================================================
-- QR CODES
-- ============================================================

-- Most critical index: QR token lookup for every customer scan
CREATE INDEX idx_qr_codes_token ON qr_codes(token) WHERE is_active = TRUE;
CREATE INDEX idx_qr_codes_table_id ON qr_codes(table_id);
CREATE INDEX idx_qr_codes_restaurant_id ON qr_codes(restaurant_id);

-- ============================================================
-- MENU
-- ============================================================

CREATE INDEX idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);
CREATE INDEX idx_menu_categories_active ON menu_categories(restaurant_id, is_active, sort_order)
  WHERE is_active = TRUE;

CREATE INDEX idx_menu_subcategories_category_id ON menu_subcategories(category_id);
CREATE INDEX idx_menu_subcategories_restaurant_id ON menu_subcategories(restaurant_id);

CREATE INDEX idx_menu_items_category_id ON menu_items(category_id, is_available);
CREATE INDEX idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_available ON menu_items(restaurant_id, is_active, is_available)
  WHERE is_active = TRUE AND is_available = TRUE;
CREATE INDEX idx_menu_items_popular ON menu_items(restaurant_id, is_popular) WHERE is_popular = TRUE;
CREATE INDEX idx_menu_items_new ON menu_items(restaurant_id, is_new) WHERE is_new = TRUE;
CREATE INDEX idx_menu_items_special ON menu_items(restaurant_id, is_special) WHERE is_special = TRUE;
CREATE INDEX idx_menu_items_sort ON menu_items(category_id, sort_order);

CREATE INDEX idx_menu_item_variants_item_id ON menu_item_variants(menu_item_id);
CREATE INDEX idx_menu_addons_item_id ON menu_addons(menu_item_id);
CREATE INDEX idx_menu_addons_restaurant_id ON menu_addons(restaurant_id);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE INDEX idx_customers_restaurant_id ON customers(restaurant_id);
CREATE INDEX idx_customers_phone ON customers(restaurant_id, phone) WHERE phone IS NOT NULL;

-- ============================================================
-- TABLE SESSIONS
-- ============================================================

CREATE INDEX idx_table_sessions_table_id ON table_sessions(table_id);
CREATE INDEX idx_table_sessions_token ON table_sessions(session_token) WHERE is_active = TRUE;
CREATE INDEX idx_table_sessions_active ON table_sessions(branch_id, is_active) WHERE is_active = TRUE;

-- ============================================================
-- ORDERS — MOST CRITICAL
-- ============================================================

-- Primary operational queries
CREATE INDEX idx_orders_restaurant_created ON orders(restaurant_id, created_at DESC);
CREATE INDEX idx_orders_branch_status ON orders(branch_id, status);
CREATE INDEX idx_orders_table_status ON orders(table_id, status);
CREATE INDEX idx_orders_customer_id ON orders(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_orders_waiter_id ON orders(assigned_waiter_id) WHERE assigned_waiter_id IS NOT NULL;

-- Live board queries (most frequent)
CREATE INDEX idx_orders_live_board ON orders(branch_id, status, created_at DESC)
  WHERE status NOT IN ('completed', 'cancelled', 'rejected');

-- Order token lookup for customer tracking
CREATE INDEX idx_orders_order_token ON orders(order_token);

-- Date-range reporting queries
CREATE INDEX idx_orders_restaurant_date ON orders(restaurant_id, placed_at DESC)
  WHERE placed_at IS NOT NULL;

-- Idempotency key lookup
CREATE UNIQUE INDEX idx_orders_client_request_id ON orders(client_request_id)
  WHERE client_request_id IS NOT NULL;

-- ============================================================
-- ORDER ITEMS
-- ============================================================

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id) WHERE menu_item_id IS NOT NULL;
CREATE INDEX idx_order_items_status ON order_items(order_id, status);
CREATE INDEX idx_order_items_kitchen_station ON order_items(kitchen_station) WHERE kitchen_station IS NOT NULL;

-- ============================================================
-- ORDER ITEM MODIFIERS
-- ============================================================

CREATE INDEX idx_order_item_modifiers_order_item_id ON order_item_modifiers(order_item_id);

-- ============================================================
-- ORDER EVENTS
-- ============================================================

CREATE INDEX idx_order_events_order_id ON order_events(order_id, created_at DESC);
CREATE INDEX idx_order_events_type ON order_events(event_type, created_at DESC);

-- ============================================================
-- WAITER SUGGESTIONS
-- ============================================================

CREATE INDEX idx_waiter_suggestions_restaurant_id ON waiter_suggestions(restaurant_id);
CREATE INDEX idx_waiter_suggestions_active ON waiter_suggestions(restaurant_id, is_active, priority)
  WHERE is_active = TRUE;
CREATE INDEX idx_waiter_suggestions_type ON waiter_suggestions(restaurant_id, suggestion_type)
  WHERE is_active = TRUE;

CREATE INDEX idx_waiter_suggestion_rules_suggestion_id ON waiter_suggestion_rules(suggestion_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_restaurant ON notifications(restaurant_id, created_at DESC);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_restaurant_id ON payments(restaurant_id, created_at DESC);
CREATE INDEX idx_payments_status ON payments(restaurant_id, status);
