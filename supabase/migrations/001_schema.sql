-- ============================================================
-- RestPilot Multi-Tenant Restaurant Platform
-- Migration 001: Core Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'platform_admin',
  'owner',
  'manager',
  'waiter',
  'chef',
  'kitchen_manager',
  'cashier'
);

CREATE TYPE order_status AS ENUM (
  'draft',
  'placed',
  'awaiting_waiter_verification',
  'waiter_reviewing',
  'confirmed',
  'kitchen_accepted',
  'preparing',
  'ready',
  'served',
  'completed',
  'cancelled',
  'rejected',
  'payment_pending',
  'payment_failed'
);

CREATE TYPE item_status AS ENUM (
  'pending',
  'accepted',
  'preparing',
  'ready',
  'served',
  'cancelled',
  'unavailable'
);

CREATE TYPE table_status AS ENUM (
  'available',
  'ordering',
  'order_active',
  'ready_to_serve',
  'bill_requested',
  'cleaning'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'partially_paid',
  'refunded',
  'failed',
  'cancelled'
);

CREATE TYPE payment_method AS ENUM (
  'cash',
  'card',
  'upi',
  'online',
  'other'
);

CREATE TYPE suggestion_type AS ENUM (
  'popular',
  'new',
  'special',
  'addon',
  'upsell',
  'seasonal'
);

CREATE TYPE actor_type AS ENUM (
  'customer',
  'waiter',
  'chef',
  'manager',
  'owner',
  'platform_admin',
  'system'
);

CREATE TYPE order_event_type AS ENUM (
  'order_placed',
  'waiter_assigned',
  'waiter_reviewing',
  'waiter_verified',
  'item_added',
  'item_removed',
  'item_modified',
  'order_confirmed',
  'kitchen_accepted',
  'preparing_started',
  'order_ready',
  'order_served',
  'order_completed',
  'order_cancelled',
  'order_rejected',
  'bill_requested',
  'payment_received'
);

CREATE TYPE dietary_type AS ENUM (
  'veg',
  'non_veg',
  'vegan',
  'gluten_free',
  'dairy_free',
  'jain',
  'halal',
  'kosher'
);

CREATE TYPE spice_level AS ENUM (
  'none',
  'mild',
  'medium',
  'hot',
  'extra_hot'
);

CREATE TYPE subscription_plan AS ENUM (
  'free',
  'standard',
  'premium'
);

CREATE TYPE subscription_status AS ENUM (
  'active',
  'trial',
  'suspended',
  'cancelled',
  'expired'
);

-- ============================================================
-- CORE USER / TENANT TABLES
-- ============================================================

-- Extended profile linked to Supabase auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'waiter',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Platform-level owner entity
CREATE TABLE owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT,
  email TEXT,
  phone TEXT,
  subscription_plan subscription_plan NOT NULL DEFAULT 'free',
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  subscription_started_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  max_restaurants INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Restaurants (one owner can have many)
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'IN',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  currency TEXT NOT NULL DEFAULT 'INR',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_accepting_orders BOOLEAN NOT NULL DEFAULT TRUE,
  primary_color TEXT DEFAULT '#FF6B35',
  secondary_color TEXT DEFAULT '#1A1A2E',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Branches within a restaurant
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  phone TEXT,
  is_main_branch BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  operating_hours JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff members (waiters, chefs, managers assigned to restaurants/branches)
CREATE TABLE staff_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  role user_role NOT NULL,
  employee_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, restaurant_id)
);

-- ============================================================
-- RESTAURANT SETTINGS
-- ============================================================

CREATE TABLE restaurant_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE,
  -- Order workflow
  waiter_verification_required BOOLEAN NOT NULL DEFAULT TRUE,
  customer_can_add_items BOOLEAN NOT NULL DEFAULT TRUE,
  customer_can_remove_confirmed_items BOOLEAN NOT NULL DEFAULT FALSE,
  waiter_recommendations_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  -- Customer info
  customer_name_required BOOLEAN NOT NULL DEFAULT FALSE,
  customer_phone_required BOOLEAN NOT NULL DEFAULT TRUE,
  -- Tax & charges
  tax_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  tax_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  tax_label TEXT DEFAULT 'GST',
  service_charge_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  service_charge_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  service_charge_label TEXT DEFAULT 'Service Charge',
  -- Operational
  auto_accept_kitchen_orders BOOLEAN NOT NULL DEFAULT FALSE,
  max_items_per_order INTEGER DEFAULT 50,
  -- Notifications
  waiter_sound_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  kitchen_sound_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE branch_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
  -- Override restaurant settings at branch level
  waiter_verification_required BOOLEAN,
  customer_can_add_items BOOLEAN,
  waiter_recommendations_enabled BOOLEAN,
  auto_accept_kitchen_orders BOOLEAN,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLES & QR CODES
-- ============================================================

CREATE TABLE restaurant_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  display_name TEXT, -- e.g., "Window Table 5", "Patio 2"
  capacity INTEGER,
  status table_status NOT NULL DEFAULT 'available',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  floor TEXT, -- e.g., "Ground Floor", "Rooftop"
  section TEXT, -- e.g., "Indoor", "Outdoor"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id, table_number)
);

CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE, -- cryptographically random, URL-safe
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by UUID REFERENCES profiles(id),
  last_scanned_at TIMESTAMPTZ,
  scan_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MENU
-- ============================================================

CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  available_from TIME, -- time-of-day availability
  available_until TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE menu_subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
  subcategory_id UUID REFERENCES menu_subcategories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Labels
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  is_new BOOLEAN NOT NULL DEFAULT FALSE,
  is_special BOOLEAN NOT NULL DEFAULT FALSE,
  is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  -- Dietary / info
  dietary_type dietary_type DEFAULT 'non_veg',
  spice_level spice_level DEFAULT 'none',
  allergens TEXT[],
  ingredients TEXT[],
  preparation_time_minutes INTEGER,
  -- Kitchen
  kitchen_station TEXT, -- e.g., "Main Kitchen", "Bar", "Grill"
  -- Availability
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  -- Tax
  tax_category TEXT,
  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE menu_item_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Size", "Crust"
  options JSONB NOT NULL DEFAULT '[]',
  -- [{name: "Small", price_delta: 0}, {name: "Large", price_delta: 80}]
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE menu_addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE, -- null = global addon
  name TEXT NOT NULL, -- e.g., "Extra Cheese", "Garlic Naan"
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS (restaurant-scoped, browser-linked)
-- ============================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  browser_fingerprint TEXT, -- optional for repeat-visit matching
  first_visit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_visit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_order_at TIMESTAMPTZ,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE SESSIONS (supports group ordering)
-- ============================================================

CREATE TABLE table_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE, -- used for customer-side session
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDERS
-- ============================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE RESTRICT,
  table_session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  assigned_waiter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Human-readable order number (per restaurant, sequential)
  order_number INTEGER NOT NULL,

  -- Status
  status order_status NOT NULL DEFAULT 'placed',

  -- Customer info snapshots (immutable after capture)
  customer_name_snapshot TEXT,
  customer_phone_snapshot TEXT,

  -- Idempotency
  client_request_id TEXT UNIQUE, -- prevents duplicate orders

  -- Order token for customer-facing tracking (not sequential)
  order_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),

  -- Special instructions from customer
  customer_notes TEXT,

  -- Financials (server-calculated)
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  service_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Timestamps for key lifecycle events
  placed_at TIMESTAMPTZ,
  waiter_assigned_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  kitchen_accepted_at TIMESTAMPTZ,
  preparing_started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-increment order_number per restaurant
CREATE SEQUENCE order_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_order_number(p_restaurant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_number INTEGER;
BEGIN
  UPDATE restaurants
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'),
    '{order_counter}',
    to_jsonb(COALESCE((metadata->>'order_counter')::INTEGER, 999) + 1)
  )
  WHERE id = p_restaurant_id
  RETURNING (metadata->>'order_counter')::INTEGER INTO v_number;
  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,

  -- Price/name snapshots (preserved even if menu item changes)
  item_name_snapshot TEXT NOT NULL,
  item_description_snapshot TEXT,
  unit_price_snapshot DECIMAL(10,2) NOT NULL,

  quantity INTEGER NOT NULL DEFAULT 1,
  line_total DECIMAL(10,2) NOT NULL DEFAULT 0, -- calculated server-side

  -- Status for kitchen tracking
  status item_status NOT NULL DEFAULT 'pending',

  -- Instructions
  special_instructions TEXT,

  -- Who added this item
  added_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  added_by_actor_type actor_type NOT NULL DEFAULT 'customer',

  -- Kitchen
  kitchen_station TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_item_modifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,

  -- Type: 'variant' or 'addon'
  modifier_type TEXT NOT NULL CHECK (modifier_type IN ('variant', 'addon')),

  -- Snapshots
  modifier_name_snapshot TEXT NOT NULL,
  option_name_snapshot TEXT,
  price_snapshot DECIMAL(10,2) NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDER EVENTS (immutable audit trail)
-- ============================================================

CREATE TABLE order_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type order_event_type NOT NULL,
  actor_type actor_type NOT NULL DEFAULT 'system',
  actor_id UUID, -- profile id if staff, null if customer/system
  metadata JSONB DEFAULT '{}',
  -- e.g., {item_name: "Gulab Jamun", quantity: 1, reason: "customer request"}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NOTE: No updated_at — this table is append-only
);

-- ============================================================
-- WAITER SUGGESTIONS
-- ============================================================

CREATE TABLE waiter_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  suggestion_type suggestion_type NOT NULL DEFAULT 'popular',
  waiter_message TEXT, -- scripted message for the waiter
  internal_notes TEXT, -- internal waiter training notes (NOT customer-visible)
  priority INTEGER NOT NULL DEFAULT 5, -- 1=highest, 10=lowest
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger rules: when to show this suggestion
CREATE TABLE waiter_suggestion_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id UUID NOT NULL REFERENCES waiter_suggestions(id) ON DELETE CASCADE,
  -- Trigger when order contains items from this category
  trigger_category_id UUID REFERENCES menu_categories(id) ON DELETE CASCADE,
  -- Trigger when order contains this specific item
  trigger_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  -- Trigger based on time of day
  trigger_time_from TIME,
  trigger_time_until TIME,
  -- Minimum group size
  min_party_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Suggestion analytics
CREATE TABLE waiter_suggestion_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id UUID NOT NULL REFERENCES waiter_suggestions(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  waiter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  was_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  revenue_generated DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  notification_type TEXT NOT NULL, -- 'new_order', 'order_ready', 'item_added', etc.
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
  status payment_status NOT NULL DEFAULT 'pending',
  method payment_method,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  external_reference TEXT, -- e.g., UPI transaction ID, card reference
  notes TEXT,
  processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles', 'owners', 'restaurants', 'branches', 'staff_members',
    'restaurant_settings', 'branch_settings', 'restaurant_tables', 'qr_codes',
    'menu_categories', 'menu_subcategories', 'menu_items', 'menu_item_variants', 'menu_addons',
    'customers', 'table_sessions', 'orders', 'order_items',
    'waiter_suggestions', 'notifications', 'payments'
  ])
  LOOP
    EXECUTE format('
      CREATE TRIGGER handle_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
    ', t, t);
  END LOOP;
END $$;

-- ============================================================
-- NEW USER PROFILE HANDLER
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'waiter')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
