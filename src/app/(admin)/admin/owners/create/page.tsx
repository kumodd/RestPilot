import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateOwnerClient from './CreateOwnerClient'

export const metadata: Metadata = { title: 'Create Owner — RestPilot Admin' }

export default async function CreateOwnerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verify platform_admin
  const { data: profileRaw } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const profile = profileRaw as { role: string } | null
  if (profile?.role !== 'platform_admin') redirect('/dashboard')

  return <CreateOwnerClient adminId={user.id} />
}
