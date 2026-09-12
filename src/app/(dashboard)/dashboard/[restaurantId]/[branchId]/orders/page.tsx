import type { Metadata } from 'next'
import LiveOrderBoardClient from './LiveOrderBoardClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Live Orders — RestPilot',
}

export default async function OrdersPage({ params }: { params: Promise<{ restaurantId: string; branchId: string }> }) {
  const { restaurantId, branchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <LiveOrderBoardClient
      restaurantId={restaurantId}
      branchId={branchId}
    />
  )
}

