'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function createInvitation(restaurantId: string, role: string, email: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Use a pure service role client without cookies to bypass RLS
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  // Generate a random 32-byte hex token
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

  // Verify the user has access to this restaurant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hasAccess } = await supabase.rpc('has_restaurant_access' as any, {
    p_restaurant_id: restaurantId
  } as any)

  // We actually need to ensure they can invite others. Owner or Manager.
  // The 'has_restaurant_access' returns true for them. Waiters shouldn't invite people, but our RPC just returns a boolean.
  // We should do a strict check for admin or manager/owner here:
  const { data: staffDataRaw } = await supabase
    .from('staff_members')
    .select('role')
    .eq('restaurant_id', restaurantId)
    .eq('profile_id', user.id)
    .single()
  
  const staffData = staffDataRaw as { role: string } | null

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { role: string } | null

  const isPlatformAdmin = profile?.role === 'platform_admin'
  const isManager = staffData?.role === 'manager'
  
  // also check if they are the owner directly
  const { data: ownerDataRaw } = await supabase
    .from('owners')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  const ownerData = ownerDataRaw as { id: string } | null

  if (!isPlatformAdmin && !isManager && !ownerData) {
    throw new Error('You do not have permission to invite staff to this restaurant.')
  }

  // Insert the invitation
  const { error } = await adminClient
    .from('invitations')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      restaurant_id: restaurantId,
      role: role,
      email: email,
      token: token,
      expires_at: expiresAt.toISOString(),
      invited_by: user.id
    } as any)

  if (error) {
    console.error('Error creating invitation:', error)
    throw new Error('Failed to create invitation')
  }

  // In a real application, you would send an email here with the token link.
  // For now, we will return the link so the frontend can display it or send it.
  return token
}

export async function validateInvitation(token: string) {
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { data, error } = await adminClient
    .from('invitations')
    .select(`
      id,
      email,
      role,
      restaurants (
        name
      )
    `)
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) {
    throw new Error('Invalid or expired invitation token')
  }

  return data
}

export async function getPendingInvitations(restaurantId: string) {
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { data, error } = await adminClient
    .from('invitations')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Failed to get pending invitations', error)
    return []
  }
  return data
}
