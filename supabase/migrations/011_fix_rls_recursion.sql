-- Migration 011: Fix RLS infinite recursion on staff_members

-- 1. Create SECURITY DEFINER functions to check roles safely
CREATE OR REPLACE FUNCTION is_restaurant_manager(p_restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_members
    WHERE profile_id = auth.uid()
      AND restaurant_id = p_restaurant_id
      AND role = 'manager'
      AND is_active = TRUE
  );
$$;

-- 2. Drop the self-referencing policies on staff_members
DROP POLICY IF EXISTS "staff_members_select" ON staff_members;
DROP POLICY IF EXISTS "staff_members_insert" ON staff_members;

-- 3. Recreate them using the SECURITY DEFINER function to break the recursion loop
CREATE POLICY "staff_members_select"
  ON staff_members FOR SELECT
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR profile_id = auth.uid()
    OR is_restaurant_manager(restaurant_id)
  );

CREATE POLICY "staff_members_insert"
  ON staff_members FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR is_restaurant_manager(restaurant_id)
  );
