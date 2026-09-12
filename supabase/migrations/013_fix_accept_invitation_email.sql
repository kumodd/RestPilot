-- ============================================================
-- RestPilot Multi-Tenant Restaurant Platform
-- Migration 013: Fix accept_invitation — Email Identity Verification
-- ============================================================
-- ADM-P1-005: accept_invitation did not verify that the authenticated
--             user's email matched the invitation's intended email.
--             Any user who obtained a token could claim another's invite.
-- ============================================================

DROP FUNCTION IF EXISTS accept_invitation(text);

CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id    UUID;
  v_user_email TEXT;
BEGIN
  -- Get the current authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user's email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

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

  -- ── SECURITY FIX: Verify the authenticated user's email matches the invitation ──
  -- This prevents a user from accepting an invitation intended for someone else.
  IF lower(v_user_email) != lower(v_invitation.email) THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address (%). Please log in with that account.', v_invitation.email;
  END IF;

  -- Ensure the profile exists (in case they didn't go through standard signup flow)
  INSERT INTO profiles (id, role, is_active)
  VALUES (v_user_id, v_invitation.role, TRUE)
  ON CONFLICT (id) DO UPDATE SET
    -- Never downgrade a platform_admin or owner to a lower role via invitation
    role      = CASE
                  WHEN profiles.role IN ('platform_admin', 'owner') THEN profiles.role
                  ELSE v_invitation.role
                END,
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
    role        = EXCLUDED.role,
    branch_id   = EXCLUDED.branch_id,
    permissions = COALESCE(v_invitation.permissions, staff_members.permissions),
    is_active   = TRUE;

  -- Mark invitation as accepted
  UPDATE invitations
  SET accepted_at = NOW()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION accept_invitation(text) TO authenticated;
