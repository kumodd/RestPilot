'use server'

import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function createInvitation(
  restaurantId: string,
  role: string,
  email: string,
  branchId: string | null = null,
  permissions: Record<string, boolean> = {},
) {
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

  // We actually need to ensure they can invite others. Owner or Manager.
  // The 'has_restaurant_access' returns true for them. Waiters shouldn't invite people, but our RPC just returns a boolean.
  // We should do a strict check for admin or manager/owner here:
  const { data: staffDataRaw } = await supabase
    .from('staff_members')
    .select('role')
    .eq('restaurant_id', restaurantId)
    .eq('profile_id', user.id)
    .limit(1)
  
  const staffData = (staffDataRaw as unknown as Array<{ role: string }> | null)?.[0] ?? null

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
    .select('id, restaurants!inner(id)')
    .eq('profile_id', user.id)
    .eq('restaurants.id', restaurantId)
    .limit(1)

  const ownerData = (ownerDataRaw as unknown as Array<{ id: string }> | null)?.[0] ?? null

  if (!isPlatformAdmin && !isManager && !ownerData) {
    throw new Error('You do not have permission to invite staff to this restaurant.')
  }

  // Insert the invitation
  const { error } = await adminClient
    .from('invitations')
    .insert({
      restaurant_id: restaurantId,
      role: role,
      email: email,
      branch_id: branchId,
      permissions,
      token: token,
      expires_at: expiresAt.toISOString(),
      invited_by: user.id
    } as unknown as never)

  if (error) {
    console.error('Error creating invitation:', error)
    throw new Error('Failed to create invitation')
  }

  // Fetch restaurant name for the email
  const { data: restaurantData } = await adminClient
    .from('restaurants')
    .select('name')
    .eq('id', restaurantId)
    .single()

  const restaurantName = restaurantData?.name || 'our restaurant'
  const roleName = role.charAt(0).toUpperCase() + role.slice(1)

  // Send email if Resend is configured
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://restpilot.space'}/auth/accept-invite?token=${token}`

      const { error: resendError } = await resend.emails.send({
        from: 'RestPilot <noreply@restpilot.space>',
        to: email,
        subject: `You've been invited to join ${restaurantName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #FF6B35;">Welcome to RestPilot!</h2>
            <p>You have been invited to join <strong>${restaurantName}</strong> as a <strong>${roleName}</strong>.</p>
            <p>Click the button below to accept your invitation and set up your account:</p>
            <p style="margin: 30px 0;">
              <a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background-color:#FF6B35;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">
                Accept Invitation
              </a>
            </p>
            <p style="color:#737373;font-size:0.9em;margin-top:40px;border-top:1px solid #eaeaea;padding-top:20px;">
              If you weren't expecting this invitation, you can safely ignore this email.
            </p>
          </div>
        `
      })

      if (resendError) {
        console.error('Resend API error:', resendError)
      }
    } catch (e) {
      console.error('Failed to initialize or send Resend email:', e)
    }
  }

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
  // Auth check: verify caller has access to this restaurant
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Must be platform_admin, owner of this restaurant, or manager
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as { role: string } | null

  if (profile?.role !== 'platform_admin') {
    // Check if they own the restaurant or are a manager
    const { data: accessRaw } = await supabase
      .from('staff_members')
      .select('role')
      .eq('restaurant_id', restaurantId)
      .eq('profile_id', user.id)
      .eq('is_active', true)
      .single()
    const staffAccess = accessRaw as { role: string } | null

    const { data: ownerAccessRaw } = await supabase
      .from('owners')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    const isOwner = ownerAccessRaw !== null
    const isManager = staffAccess?.role === 'manager'

    if (!isOwner && !isManager) {
      throw new Error('You do not have permission to view invitations for this restaurant.')
    }
  }

  // Now fetch with service role (bypasses INSERT/UPDATE FALSE policies for reads)
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
