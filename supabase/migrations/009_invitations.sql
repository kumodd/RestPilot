-- ============================================================
-- RestPilot Multi-Tenant Restaurant Platform
-- Migration 009: Invitations and Trigger Bypass
-- ============================================================

-- 1. Create Invitations Table
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Platform admins and Owners/Managers can see invitations for their restaurants
CREATE POLICY "invitations_select"
  ON invitations FOR SELECT
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR EXISTS (
      SELECT 1 FROM staff_members
      WHERE profile_id = auth.uid()
        AND restaurant_id = invitations.restaurant_id
        AND role = 'manager'
        AND is_active = TRUE
    )
  );

-- Insert/Update handled securely via server actions (Service Role) or RPC
-- To keep it simple, we allow service_role and explicit RPC bypass, and deny all direct client inserts.
CREATE POLICY "invitations_insert"
  ON invitations FOR INSERT
  WITH CHECK (FALSE);

CREATE POLICY "invitations_update"
  ON invitations FOR UPDATE
  USING (FALSE);

CREATE POLICY "invitations_delete"
  ON invitations FOR DELETE
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
  );

-- 2. Update Triggers to allow RPC bypass
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('restpilot.trigger_bypass', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NOT is_platform_admin() THEN
    NEW.role := OLD.role;
    NEW.is_active := OLD.is_active;
    NEW.id := OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION protect_staff_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('restpilot.trigger_bypass', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NOT (is_platform_admin() OR owns_restaurant(OLD.restaurant_id)) THEN
    NEW.role := OLD.role;
    NEW.restaurant_id := OLD.restaurant_id;
    NEW.is_active := OLD.is_active;
    NEW.profile_id := OLD.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Accept Invitation RPC
CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT)
RETURNS void AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Find and validate invitation
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Bypass triggers for these internal updates
  PERFORM set_config('restpilot.trigger_bypass', 'true', true);

  -- Mark accepted
  UPDATE invitations SET accepted_at = NOW() WHERE id = v_invitation.id;

  -- Create staff_members record (UPSERT)
  INSERT INTO staff_members (profile_id, restaurant_id, role, is_active)
  VALUES (auth.uid(), v_invitation.restaurant_id, v_invitation.role, TRUE)
  ON CONFLICT (profile_id, restaurant_id) DO UPDATE 
  SET role = EXCLUDED.role, is_active = TRUE;

  -- Update user role in profiles (only upgrade, don't downgrade a manager to a waiter, but for simplicity we overwrite here)
  -- Wait, if they are already an owner, don't downgrade them!
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('platform_admin', 'owner')) THEN
     UPDATE profiles SET role = v_invitation.role WHERE id = auth.uid();
  END IF;

  -- Remove trigger bypass
  PERFORM set_config('restpilot.trigger_bypass', 'false', true);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
