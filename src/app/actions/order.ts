'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function getOrderByToken(orderToken: string) {
  const supabase = await createServiceClient()
  
  const { data, error } = await supabase
    .from('orders')
    .select(`
      order_number,
      status,
      subtotal,
      tax,
      service_charge,
      total,
      placed_at,
      confirmed_at,
      ready_at,
      served_at,
      restaurant_tables (
        table_number
      ),
      restaurants (
        currency_symbol
      ),
      order_items (
        id,
        menu_item_id,
        item_name_snapshot,
        quantity,
        status,
        special_instructions
      ),
      order_events (
        event_type,
        created_at
      )
    `)
    .eq('order_token', orderToken)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/lib/types/database.types'

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Get user profile to determine actor type
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (!profile) throw new Error('Profile not found')
  const profileRole = (profile as unknown as { role: string }).role

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('transition_order_status', {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_actor_id: user.id,
    p_actor_type: profileRole,
  })

  if (error) {
    console.error('Failed to update order status:', error)
    throw new Error('Failed to update order status')
  }

  return data
}

export async function updateOrderItemStatus(itemId: string, newStatus: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // The RPC derives the staff role, restaurant and branch from auth.uid().
  // Do not update order_items directly from the browser.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('update_order_item_status', {
    p_item_id: itemId,
    p_new_status: newStatus,
  })
  if (error || data?.error) throw new Error(error?.message ?? data?.error ?? 'Failed to update order item')
  return data
}
