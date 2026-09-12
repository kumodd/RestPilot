import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ restaurantId: string }>
}) {
  const { restaurantId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profileRaw } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profileRaw as { role: string } | null
  
  let hasAccess = false
  if (profile?.role === 'owner' || profile?.role === 'platform_admin') {
    const { data: ownerRaw } = await supabase.from('owners').select('id').eq('profile_id', user.id).single()
    const owner = ownerRaw as { id: string } | null
    if (owner) {
      const { data: restRaw } = await supabase.from('restaurants').select('id').eq('id', restaurantId).eq('owner_id', owner.id).single()
      const rest = restRaw as { id: string } | null
      if (rest) hasAccess = true
    }
  } else {
    // We explicitly avoid .single() here to prevent PGRST116 when a waiter belongs to multiple branches!
    const { data: staffRaw, error: staffError } = await supabase.from('staff_members').select('id').eq('profile_id', user.id).eq('restaurant_id', restaurantId).eq('is_active', true).limit(1)
    if (staffError) console.error('Staff check error:', staffError)
    const staff = (staffRaw as { id: string }[] | null)?.[0] || null
    if (staff) hasAccess = true
  }

  if (!hasAccess) {
    console.log(`Access denied for user ${user.id} to restaurant ${restaurantId}. Redirecting to /dashboard.`)
    redirect('/dashboard') // Redirect to global dashboard if they try to access a restaurant they don't own/work at
  }

  return <>{children}</>
}
