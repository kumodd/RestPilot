-- ============================================================
-- Migration 015: Staff Invitation RPC for Mobile Clients
-- ============================================================

CREATE OR REPLACE FUNCTION invite_staff_member(
  p_restaurant_id UUID,
  p_role TEXT,
  p_email TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
  v_is_authorized BOOLEAN := FALSE;
  v_caller_role TEXT;
  v_is_owner BOOLEAN;
BEGIN
  -- 1. Check if caller is platform_admin
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role = 'platform_admin' THEN
    v_is_authorized := TRUE;
  END IF;

  -- 2. Check if caller is owner
  IF NOT v_is_authorized THEN
    SELECT TRUE INTO v_is_owner FROM owners WHERE profile_id = auth.uid() AND id IN (SELECT owner_id FROM restaurants WHERE id = p_restaurant_id);
    IF v_is_owner THEN
      v_is_authorized := TRUE;
    END IF;
  END IF;

  -- 3. Check if caller is manager
  IF NOT v_is_authorized THEN
    SELECT TRUE INTO v_is_authorized FROM staff_members 
    WHERE profile_id = auth.uid() AND restaurant_id = p_restaurant_id AND role = 'manager' AND is_active = TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Not authorized to invite staff';
  END IF;

  -- Generate token
  v_token := encode(gen_random_bytes(16), 'hex');

  -- Insert into invitations table
  INSERT INTO invitations (
    restaurant_id, role, email, token, expires_at, invited_by
  ) VALUES (
    p_restaurant_id, p_role, p_email, v_token, NOW() + INTERVAL '7 days', auth.uid()
  );

  RETURN v_token;
END;
$$;
