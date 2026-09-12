import type { Metadata } from 'next'
import CashierClient from './CashierClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Cashier — RestPilot',
}

export default async function CashierPage({ params }: { params: Promise<{ restaurantId: string; branchId: string }> }) {
  const { restaurantId, branchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <CashierClient
      restaurantId={restaurantId}
      branchId={branchId}
    />
  )
}

