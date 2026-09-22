import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StaffPageClient from './StaffPageClient'
import type { UserRole } from '@/lib/types/database.types'

export const metadata: Metadata = {
  title: 'Staff Management — RestPilot',
}

interface StaffMemberRow {
  id: string
  role: UserRole
  employee_code: string | null
  is_active: boolean
  joined_at: string
  branch_id: string | null
  permissions: Record<string, boolean>
  profiles: { full_name: string | null; phone: string | null; avatar_url: string | null } | null
  branches: { name: string } | null
}

export default async function StaffPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: staffRaw } = await supabase
    .from('staff_members')
    .select(`
      id, role, employee_code, is_active, joined_at, branch_id, permissions,
      profiles (full_name, phone, avatar_url),
      branches (name)
    `)
    .eq('restaurant_id', restaurantId)
    .order('joined_at', { ascending: false })

  const { data: branchesRaw } = await supabase
    .from('branches')
    .select('id, name')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)

  // Use Server Action to bypass RLS issues for pending invitations
  const { getPendingInvitations } = await import('@/app/actions/invitation')
  const invitationsRaw = await getPendingInvitations(restaurantId)

  return (
    <StaffPageClient
      staff={(staffRaw as unknown as StaffMemberRow[]) ?? []}
      invitations={(invitationsRaw as unknown as Array<{ id: string; role: string; email: string; token: string; created_at: string }>) ?? []}
      branches={(branchesRaw as Array<{ id: string; name: string }>) ?? []}
      restaurantId={restaurantId}
    />
  )
}
