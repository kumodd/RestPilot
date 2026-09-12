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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('transition_order_status', {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_actor_id: user.id,
    p_actor_type: (profile as any).role,
  })

  if (error) {
    console.error('Failed to update order status:', error)
    throw new Error('Failed to update order status')
  }

  return data
}
