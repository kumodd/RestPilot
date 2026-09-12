-- Migration 010: Add branch_id and permissions to invitations

ALTER TABLE invitations
ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
ADD COLUMN permissions JSONB DEFAULT '{}';

-- Update the accept_invitation RPC to apply these fields when inserting into staff_members
DROP FUNCTION IF EXISTS accept_invitation(text);

CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
BEGIN
  -- Get the current authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find and lock the invitation
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Ensure the profile exists (just in case they didn't go through standard signup flow)
  INSERT INTO profiles (id, role, is_active)
  VALUES (v_user_id, v_invitation.role, TRUE)
  ON CONFLICT (id) DO UPDATE SET
    role = CASE WHEN profiles.role = 'platform_admin' THEN profiles.role ELSE v_invitation.role END,
    is_active = TRUE;

  -- Add to staff_members
  INSERT INTO staff_members (
    profile_id, 
    restaurant_id, 
    role, 
    branch_id, 
    permissions, 
    is_active
  )
  VALUES (
    v_user_id, 
    v_invitation.restaurant_id, 
    v_invitation.role, 
    v_invitation.branch_id, 
    COALESCE(v_invitation.permissions, '{}'::jsonb), 
    TRUE
  )
  ON CONFLICT (profile_id, restaurant_id) DO UPDATE SET
    role = EXCLUDED.role,
    branch_id = EXCLUDED.branch_id,
    permissions = COALESCE(v_invitation.permissions, staff_members.permissions),
    is_active = TRUE;

  -- Mark invitation as accepted
  UPDATE invitations
  SET accepted_at = NOW()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true);
END;
$$;
