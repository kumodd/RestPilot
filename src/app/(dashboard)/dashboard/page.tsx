import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreateRestaurantModal from './CreateRestaurantModal'
import { createRestaurantAction } from '@/app/actions/restaurant'
import RestaurantCard from './RestaurantCard'

export default async function GlobalDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as { role: string } | null

  if (!profile) redirect('/auth/login')

  let restaurants: any[] = []
  let maxRestaurants = 0
  let canCreate = false

  if (profile.role === 'owner' || profile.role === 'platform_admin') {
    const { data: ownerRaw } = await supabase
      .from('owners')
      .select('id, max_restaurants')
      .eq('profile_id', user.id)
      .single()
    const owner = ownerRaw as { id: string; max_restaurants: number } | null

    if (owner) {
      maxRestaurants = owner.max_restaurants
      const { data: rests } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', owner.id)
        .eq('is_active', true)
      
      restaurants = rests || []
      canCreate = restaurants.length < maxRestaurants
    }
  } else {
    // Staff member
    const { data: staffMembers } = await supabase
      .from('staff_members')
      .select('restaurant_id, role, restaurants(*)')
      .eq('profile_id', user.id)
      .eq('is_active', true)
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    restaurants = (staffMembers as any[])?.map(s => s.restaurants) || []
  }

  return (
    <main className="page-content" style={{ padding: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2rem' }}>Your Restaurants</h1>
          <p className="page-subtitle">Select a restaurant to manage</p>
        </div>
        
        {canCreate && (
          <CreateRestaurantModal 
            action={createRestaurantAction} 
            maxRestaurants={maxRestaurants}
            currentCount={restaurants.length}
          />
        )}
      </div>

      {restaurants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏪</div>
          <h1 className="empty-state-title">Welcome to RestPilot</h1>
          <p className="empty-state-desc">You don't have any active restaurants yet.</p>
          {canCreate && (
             <CreateRestaurantModal 
               action={createRestaurantAction} 
               maxRestaurants={maxRestaurants}
               currentCount={0}
             />
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {restaurants.map(rest => (
            <RestaurantCard key={rest.id} rest={rest} />
          ))}
        </div>
      )}
    </main>
  )
}

