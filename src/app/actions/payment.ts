'use server'

import { createClient } from '@/lib/supabase/server'

export async function processPayment(orderId: string, method: string, amount: number, externalReference?: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Utilize the secure, atomic transaction RPC to prevent double billing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('process_secure_payment', {
    p_order_id: orderId,
    p_method: method,
    p_amount: amount,
    p_external_reference: externalReference || null
  })

  if (error || data?.error) {
    console.error('Payment Error:', error || data?.error)
    throw new Error(data?.error || 'Failed to process payment')
  }

  return { id: data.payment_id }
}
