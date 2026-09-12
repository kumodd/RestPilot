import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import MenuPageClient from './MenuPageClient'
import type { QRResolution, RestaurantSettings } from '@/lib/types/app.types'

interface Props {
  params: Promise<{ tableToken: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tableToken } = await params
  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.rpc as any)('resolve_qr_token', { p_token: tableToken })
  if (!data || data.error) return { title: 'Menu' }
  return {
    title: `${data?.restaurant?.name ?? 'Restaurant'} — Menu`,
    description: `Browse and order from ${data?.restaurant?.name}'s digital menu.`,
  }
}

export default async function MenuPage({ params }: Props) {
  const { tableToken } = await params
  const supabase = await createServiceClient()

  // Resolve QR
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: qrData, error: qrError } = await (supabase.rpc as any)('resolve_qr_token', {
    p_token: tableToken,
  })
  if (qrError || !qrData || qrData.error) notFound()

  const typedQR = qrData as QRResolution
  const restaurantId = typedQR.restaurant.id

  // Fetch menu categories with items
  const { data: categories, error: catError } = await supabase
    .from('menu_categories')
    .select(`
      id, name, description, image_url, sort_order,
      menu_items (
        id, name, description, image_url, base_price,
        is_popular, is_new, is_special, is_recommended,
        dietary_type, spice_level, preparation_time_minutes,
        is_active, is_available, sort_order,
        menu_item_variants (id, name, options, is_required, sort_order),
        menu_addons (id, name, price, is_active, sort_order)
      )
    `)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .eq('is_available', true)
    .order('sort_order', { ascending: true })

  if (catError) notFound()

  // Fetch restaurant settings
  const { data: settings } = await supabase
    .from('restaurant_settings')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .single()

  return (
    <MenuPageClient
      resolution={typedQR}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categories={(categories ?? []) as any}
      settings={settings as RestaurantSettings | null}
      tableToken={tableToken}
    />
  )
}
