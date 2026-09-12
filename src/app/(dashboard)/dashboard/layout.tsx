import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/components/dashboard/DashboardNav'
import type { Profile } from '@/lib/types/app.types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/dashboard')
  }

  // Get profile
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as Profile | null

  if (!profile?.is_active) {
    redirect('/auth/login?error=account_inactive')
  }

  // Fetch restaurants for the switcher
  let restaurants: any[] = []
  if (profile.role === 'platform_admin') {
    const { data: rests } = await supabase.from('restaurants').select('id, name').eq('is_active', true)
    restaurants = rests || []
  } else if (profile.role === 'owner') {
    const { data: ownerRaw } = await supabase.from('owners').select('id').eq('profile_id', user.id).single()
    const owner = ownerRaw as { id: string } | null
    if (owner) {
      const { data: rests } = await supabase.from('restaurants').select('id, name').eq('owner_id', owner.id).eq('is_active', true)
      restaurants = rests || []
    }
  } else {
    const { data: staffMembers } = await supabase.from('staff_members').select('restaurants(id, name)').eq('profile_id', user.id).eq('is_active', true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    restaurants = (staffMembers as any[])?.map(s => s.restaurants).filter(r => r) || []
  }

  // De-duplicate in case of multiple staff roles at same restaurant
  const uniqueRestaurants = Array.from(new Map(restaurants.map(r => [r.id, r])).values())

  return (
    <div className="dashboard-layout">
      <DashboardNav profile={profile!} user={user} restaurants={uniqueRestaurants} />
      <div className="dashboard-main">
        {children}
      </div>
    </div>
  )
}

