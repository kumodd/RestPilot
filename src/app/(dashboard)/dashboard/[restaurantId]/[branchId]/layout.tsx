import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function BranchLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ restaurantId: string; branchId: string }>
}) {
  const { restaurantId, branchId } = await params
  const supabase = await createClient()

  // Verify that the branch actually belongs to this restaurant
  const { data: branch } = await supabase
    .from('branches')
    .select('id')
    .eq('id', branchId)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .single()

  if (!branch) {
    redirect(`/dashboard/${restaurantId}`) // invalid branch for this restaurant
  }

  // Check if staff is restricted to a different branch
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profileRaw } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const profile = profileRaw as { role: string } | null
    if (profile && profile.role !== 'owner' && profile.role !== 'platform_admin') {
      const { data: staffRaw } = await supabase
        .from('staff_members')
        .select('branch_id')
        .eq('profile_id', user.id)
        .eq('restaurant_id', restaurantId)
        .limit(1)
      
      const staff = (staffRaw as { branch_id: string | null }[] | null)?.[0] || null
      
      // If staff has a specific branch_id assigned, they can only access that branch
      if (staff?.branch_id && staff.branch_id !== branchId) {
        redirect(`/dashboard/${restaurantId}/${staff.branch_id}/orders`)
      }
    }
  }

  return <>{children}</>
}
