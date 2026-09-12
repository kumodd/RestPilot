'use server'

import { createClient } from '@/lib/supabase/server'

export async function processPayment(orderId: string, method: string, amount: number, externalReference?: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify actor has access and gets order info
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('restaurant_id, total, status')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new Error('Order not found or access denied')
  }

  // Ensure exact amount matches if we want strict payments, or just log the amount
  // We'll insert into payments table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payment, error: paymentError } = await (supabase.from('payments') as any)
    .insert({
      order_id: orderId,
      restaurant_id: (order as any).restaurant_id,
      status: 'completed',
      method: method,
      amount: amount,
      external_reference: externalReference,
      processed_by: user.id,
      processed_at: new Date().toISOString()
    })
    .select()
    .single()

  if (paymentError) {
    console.error('Payment Error:', paymentError)
    throw new Error('Failed to process payment')
  }

  // Auto transition order to completed using secure RPC if it's served
  if ((order as any).status !== 'completed') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)('transition_order_status', {
      p_order_id: orderId,
      p_new_status: 'completed',
      p_actor_id: user.id,
      p_actor_type: 'cashier',
    })
  }

  return payment
}
