import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import KitchenDisplayClient from './KitchenDisplayClient'

export const metadata: Metadata = {
  title: 'Kitchen Display — RestPilot',
  description: 'Real-time kitchen display system for order preparation.',
}

export default async function KitchenPage({ params }: { params: Promise<{ restaurantId: string; branchId: string }> }) {
  const { restaurantId, branchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return <KitchenDisplayClient restaurantId={restaurantId} branchId={branchId} />
}

