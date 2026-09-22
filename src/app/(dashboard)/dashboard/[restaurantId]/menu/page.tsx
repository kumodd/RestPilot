import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MenuEditorClient from './MenuEditorClient'

export const metadata: Metadata = {
  title: 'Menu Management — RestPilot',
  description: 'Create and manage your restaurant menu categories, items, variants, and add-ons.',
}

interface CategoryRow {
  id: string
  name: string
  description: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  is_available: boolean
  menu_items: MenuItemRow[]
}

interface MenuItemRow {
  id: string
  name: string
  description: string | null
  image_url: string | null
  base_price: number
  is_popular: boolean
  is_new: boolean
  is_special: boolean
  is_recommended: boolean
  dietary_type: string | null
  spice_level: string | null
  preparation_time_minutes: number | null
  is_active: boolean
  is_available: boolean
  sort_order: number
  category_id: string
  menu_item_variants: VariantRow[]
  menu_addons: AddonRow[]
}

interface VariantRow {
  id: string
  name: string
  options: unknown
  is_required: boolean
  sort_order: number
}

interface AddonRow {
  id: string
  name: string
  price: number
  is_active: boolean
  sort_order: number
}

export default async function MenuPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // The server-side check controls the write surface. RLS remains the
  // authoritative enforcement for every direct menu mutation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: canManageMenu } = await (supabase.rpc as any)('is_restaurant_manager', {
    p_restaurant_id: restaurantId,
  })

  const { data: categoriesRaw } = await supabase
    .from('menu_categories')
    .select(`
      id, name, description, image_url, sort_order, is_active, is_available,
      menu_items (
        id, name, description, image_url, base_price,
        is_popular, is_new, is_special, is_recommended,
        dietary_type, spice_level, preparation_time_minutes,
        is_active, is_available, sort_order, category_id,
        menu_item_variants (id, name, options, is_required, sort_order),
        menu_addons (id, name, price, is_active, sort_order)
      )
    `)
    .eq('restaurant_id', restaurantId)
    .order('sort_order', { ascending: true })

  const categories = (categoriesRaw as unknown as CategoryRow[]) ?? []

  return (
    <MenuEditorClient
      categories={categories}
      restaurantId={restaurantId}
      canManageMenu={canManageMenu === true}
    />
  )
}
