-- ============================================================
-- RestPilot Migration 020: AI menu imports
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  source_file_path TEXT NOT NULL,
  source_file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'ready', 'applied', 'failed')),
  extracted_menu JSONB NOT NULL DEFAULT '{"categories": []}'::JSONB,
  category_count INTEGER NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_menu_imports_restaurant_created
  ON menu_imports(restaurant_id, created_at DESC);

ALTER TABLE menu_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY menu_imports_select
  ON menu_imports FOR SELECT
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR EXISTS (
      SELECT 1
      FROM staff_members sm
      WHERE sm.profile_id = auth.uid()
        AND sm.restaurant_id = menu_imports.restaurant_id
        AND sm.role = 'manager'
        AND sm.is_active = TRUE
    )
  );

CREATE POLICY menu_imports_manager_insert
  ON menu_imports FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR is_restaurant_manager(restaurant_id)
  );

CREATE POLICY menu_imports_manager_update
  ON menu_imports FOR UPDATE
  USING (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR is_restaurant_manager(restaurant_id)
  )
  WITH CHECK (
    is_platform_admin()
    OR owns_restaurant(restaurant_id)
    OR is_restaurant_manager(restaurant_id)
  );

DROP TRIGGER IF EXISTS handle_menu_imports_updated_at ON menu_imports;
CREATE TRIGGER handle_menu_imports_updated_at
  BEFORE UPDATE ON menu_imports
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Original uploads remain private. The server action uses the service role
-- to write to this bucket and never exposes the source image publicly.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-imports',
  'menu-imports',
  FALSE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::TEXT[]
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::TEXT[];

CREATE OR REPLACE FUNCTION apply_menu_import(
  p_import_id UUID,
  p_menu JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_import menu_imports%ROWTYPE;
  v_category_data JSONB;
  v_item_data JSONB;
  v_variant_data JSONB;
  v_addon_data JSONB;
  v_category_id UUID;
  v_item_id UUID;
  v_category_count INTEGER := 0;
  v_item_count INTEGER := 0;
  v_category_name TEXT;
  v_item_name TEXT;
  v_dietary TEXT;
  v_spice TEXT;
  v_price NUMERIC;
BEGIN
  IF p_menu IS NULL OR jsonb_typeof(p_menu) <> 'object' THEN
    RETURN jsonb_build_object('error', 'Invalid menu draft');
  END IF;

  SELECT * INTO v_import
  FROM menu_imports
  WHERE id = p_import_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Menu import not found');
  END IF;
  IF NOT is_restaurant_manager(v_import.restaurant_id) THEN
    RETURN jsonb_build_object('error', 'Manager access required');
  END IF;
  IF v_import.status <> 'ready' THEN
    RETURN jsonb_build_object('error', 'This import is no longer available');
  END IF;

  FOR v_category_data IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_menu->'categories', '[]'::JSONB))
  LOOP
    v_category_name := NULLIF(BTRIM(LEFT(v_category_data->>'name', 120)), '');
    IF v_category_name IS NULL THEN CONTINUE; END IF;

    INSERT INTO menu_categories (
      restaurant_id, name, description, sort_order, is_active, is_available
    ) VALUES (
      v_import.restaurant_id,
      v_category_name,
      NULLIF(BTRIM(LEFT(v_category_data->>'description', 500)), ''),
      v_category_count,
      TRUE,
      TRUE
    ) RETURNING id INTO v_category_id;
    v_category_count := v_category_count + 1;

    FOR v_item_data IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_category_data->'items', '[]'::JSONB))
    LOOP
      v_item_name := NULLIF(BTRIM(LEFT(v_item_data->>'name', 160)), '');
      IF v_item_name IS NULL THEN CONTINUE; END IF;

      v_price := GREATEST(COALESCE((v_item_data->>'price')::NUMERIC, 0), 0);
      v_dietary := NULLIF(v_item_data->>'dietary_type', '');
      IF v_dietary NOT IN ('veg', 'non_veg', 'vegan', 'gluten_free', 'dairy_free', 'jain', 'halal', 'kosher') THEN
        v_dietary := NULL;
      END IF;
      v_spice := NULLIF(v_item_data->>'spice_level', '');
      IF v_spice NOT IN ('none', 'mild', 'medium', 'hot', 'extra_hot') THEN
        v_spice := NULL;
      END IF;

      INSERT INTO menu_items (
        restaurant_id, category_id, name, description, base_price,
        dietary_type, spice_level, sort_order, is_active, is_available
      ) VALUES (
        v_import.restaurant_id,
        v_category_id,
        v_item_name,
        NULLIF(BTRIM(LEFT(v_item_data->>'description', 1000)), ''),
        v_price,
        v_dietary::dietary_type,
        v_spice::spice_level,
        v_item_count,
        TRUE,
        TRUE
      ) RETURNING id INTO v_item_id;
      v_item_count := v_item_count + 1;

      FOR v_variant_data IN
        SELECT value FROM jsonb_array_elements(COALESCE(v_item_data->'variants', '[]'::JSONB))
      LOOP
        IF NULLIF(BTRIM(LEFT(v_variant_data->>'name', 120)), '') IS NOT NULL THEN
          INSERT INTO menu_item_variants (
            menu_item_id, name, options, is_required, sort_order
          ) VALUES (
            v_item_id,
            BTRIM(LEFT(v_variant_data->>'name', 120)),
            COALESCE(v_variant_data->'options', '[]'::JSONB),
            COALESCE((v_variant_data->>'is_required')::BOOLEAN, FALSE),
            0
          );
        END IF;
      END LOOP;

      FOR v_addon_data IN
        SELECT value FROM jsonb_array_elements(COALESCE(v_item_data->'addons', '[]'::JSONB))
      LOOP
        IF NULLIF(BTRIM(LEFT(v_addon_data->>'name', 120)), '') IS NOT NULL THEN
          INSERT INTO menu_addons (
            restaurant_id, menu_item_id, name, price, is_active, sort_order
          ) VALUES (
            v_import.restaurant_id,
            v_item_id,
            BTRIM(LEFT(v_addon_data->>'name', 120)),
            GREATEST(COALESCE((v_addon_data->>'price')::NUMERIC, 0), 0),
            TRUE,
            0
          );
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  UPDATE menu_imports
  SET status = 'applied',
      extracted_menu = p_menu,
      category_count = v_category_count,
      item_count = v_item_count,
      applied_at = NOW(),
      updated_at = NOW()
  WHERE id = p_import_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'category_count', v_category_count,
    'item_count', v_item_count
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION apply_menu_import(UUID, JSONB) TO authenticated;
