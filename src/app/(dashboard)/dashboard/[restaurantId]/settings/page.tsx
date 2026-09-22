import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export const metadata: Metadata = {
  title: 'Restaurant Settings — RestPilot',
}

interface RestaurantRow {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  currency: string
  currency_symbol: string
  phone: string | null
  email: string | null
  website_url: string | null
}

interface SettingsRow {
  id: string
  restaurant_id: string
  waiter_verification_required: boolean
  customer_can_add_items: boolean
  customer_can_remove_confirmed_items: boolean
  waiter_recommendations_enabled: boolean
  customer_name_required: boolean
  customer_phone_required: boolean
  tax_enabled: boolean
  tax_percentage: number
  tax_label: string | null
  service_charge_enabled: boolean
  service_charge_percentage: number
  service_charge_label: string | null
  auto_accept_kitchen_orders: boolean
  max_items_per_order: number | null
  waiter_sound_notifications: boolean
  kitchen_sound_notifications: boolean
}

export default async function SettingsPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: restaurantRaw }, { data: settingsRaw }] = await Promise.all([
    supabase.from('restaurants').select('id, name, slug, description, logo_url, currency, currency_symbol, phone, email, website_url').eq('id', restaurantId).single(),
    supabase.from('restaurant_settings').select('*').eq('restaurant_id', restaurantId).single(),
  ])

  const restaurant = restaurantRaw as RestaurantRow | null
  const settings = settingsRaw as SettingsRow | null

  return (
    <SettingsClient
      restaurant={restaurant}
      settings={settings}
      restaurantId={restaurantId}
    />
  )
}
