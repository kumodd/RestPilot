-- ============================================================
-- RestPilot Multi-Tenant Restaurant Platform
-- Migration 008: Column-Level Security Triggers
-- ============================================================
-- This migration implements BEFORE UPDATE triggers to prevent
-- malicious privilege escalation via RLS column bypass.

-- ============================================================
-- 1. PROTECT PROFILES TABLE
-- Prevent users from elevating their role or bypassing suspension
-- ============================================================
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    NEW.role := OLD.role;
    NEW.is_active := OLD.is_active;
    NEW.id := OLD.id; -- Prevent changing ID
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_profile_security
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_fields();

-- ============================================================
-- 2. PROTECT STAFF_MEMBERS TABLE
-- Prevent cross-restaurant access and staff role escalation
-- ============================================================
CREATE OR REPLACE FUNCTION protect_staff_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Admins can update anything. Owners can update staff in their restaurants.
  -- Otherwise, fields are locked.
  IF NOT (is_platform_admin() OR owns_restaurant(OLD.restaurant_id)) THEN
    NEW.role := OLD.role;
    NEW.restaurant_id := OLD.restaurant_id;
    NEW.is_active := OLD.is_active;
    NEW.profile_id := OLD.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_staff_security
  BEFORE UPDATE ON staff_members
  FOR EACH ROW
  EXECUTE FUNCTION protect_staff_fields();

-- ============================================================
-- 3. PROTECT OWNERS TABLE
-- Prevent owners from upgrading their subscriptions for free
-- ============================================================
CREATE OR REPLACE FUNCTION protect_owner_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    NEW.subscription_plan := OLD.subscription_plan;
    NEW.subscription_status := OLD.subscription_status;
    NEW.subscription_started_at := OLD.subscription_started_at;
    NEW.subscription_expires_at := OLD.subscription_expires_at;
    NEW.max_restaurants := OLD.max_restaurants;
    NEW.is_active := OLD.is_active;
    NEW.profile_id := OLD.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_owner_security
  BEFORE UPDATE ON owners
  FOR EACH ROW
  EXECUTE FUNCTION protect_owner_fields();

-- ============================================================
-- 4. PROTECT RESTAURANTS TABLE
-- Prevent restaurant theft or unauthorized deactivation
-- ============================================================
CREATE OR REPLACE FUNCTION protect_restaurant_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    -- Nobody but admin can change owner_id
    NEW.owner_id := OLD.owner_id;
    
    -- Only admin or owner can change is_active
    IF NOT owns_restaurant(OLD.id) THEN
        NEW.is_active := OLD.is_active;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_restaurant_security
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION protect_restaurant_fields();
