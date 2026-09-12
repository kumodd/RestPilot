'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createRestaurantAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const city = formData.get('city') as string
  const currency = formData.get('currency') as string

  if (!name || !slug || !city || !currency) {
    return { error: 'All fields are required.' }
  }

  // Verify owner and limits
  const { data: ownerRaw } = await supabase
    .from('owners')
    .select('id, max_restaurants')
    .eq('profile_id', user.id)
    .single()

  const owner = ownerRaw as { id: string; max_restaurants: number } | null

  if (!owner) return { error: 'You are not registered as an owner.' }

  const { count } = await supabase
    .from('restaurants')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', owner.id)
    .eq('is_active', true)

  if (count !== null && count >= owner.max_restaurants) {
    return { error: 'You have reached your restaurant limit. Please upgrade your plan.' }
  }

  // Verify slug uniqueness
  const { count: slugCount } = await supabase
    .from('restaurants')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug)

  if (slugCount !== null && slugCount > 0) {
    return { error: 'This identifier (slug) is already taken.' }
  }

  // Use a transaction/RPC or sequential inserts.
  // In Supabase without a custom RPC, we just do sequential inserts. 
  // It's safe since RLS protects it, though partial failure is possible.
  
  // 1. Create Restaurant
  const { data: restaurantRaw, error: restError } = await supabase
    .from('restaurants')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      owner_id: owner.id,
      name,
      slug,
      city,
      currency_symbol: currency,
      is_active: true
    } as any)
    .select('id')
    .single()

  const restaurant = restaurantRaw as { id: string } | null

  if (restError || !restaurant) {
    console.error('Restaurant creation error:', restError)
    return { error: 'Failed to create restaurant.' }
  }

  // 2. Create Default Branch
  const { data: branchRaw, error: branchError } = await supabase
    .from('branches')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      restaurant_id: restaurant.id,
      name: 'Main Branch',
      city: city,
      is_main_branch: true,
      is_active: true
    } as any)
    .select('id')
    .single()

  const branch = branchRaw as { id: string } | null

  if (branchError || !branch) {
    console.error('Branch creation error:', branchError)
    return { error: 'Restaurant created, but failed to create default branch.' }
  }

  // 3. Create Default Branch Settings
  await supabase
    .from('branch_settings')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      branch_id: branch.id,
      verification_required: true,
      allow_cash_payment: true,
      allow_online_payment: true
    } as any)

  // 4. Assign Owner as Platform Admin / Manager for this specific restaurant if needed
  // Note: Owners automatically have access via the `owners` table in RLS, but adding them to staff_members makes queries uniform.
  await supabase
    .from('staff_members')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      profile_id: user.id,
      restaurant_id: restaurant.id,
      role: 'manager', // Owners act as managers at the restaurant level
      is_active: true
    } as any)

  revalidatePath('/dashboard')
  return { success: true, restaurantId: restaurant.id }
}
