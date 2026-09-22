-- ============================================================
-- RestPilot Migration 022: UUID compatibility for the linked project
-- ============================================================

-- The linked database has gen_random_uuid() but not uuid-ossp's
-- uuid_generate_v4(). Existing order creation functions use the older name.
CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
RETURNS UUID
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gen_random_uuid();
$$;

REVOKE ALL ON FUNCTION public.uuid_generate_v4() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.uuid_generate_v4() TO authenticated;
