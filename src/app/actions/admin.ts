'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Auth helper ────────────────────────────────────────────────────────────
async function getAdminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as { role: string } | null
  if (profile?.role !== 'platform_admin') {
    throw new Error('Unauthorized: platform_admin only')
  }

  return { supabase, user }
}

// ── OWNER ACTIONS ──────────────────────────────────────────────────────────

export async function suspendOwnerAction(ownerId: string) {
  const { supabase } = await getAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('suspend_owner', {
    p_owner_id: ownerId,
  })

  if (error) {
    console.error('suspend_owner error:', error)
    return { error: error.message || 'Failed to suspend owner' }
  }

  revalidatePath('/admin/owners')
  revalidatePath(`/admin/owners/${ownerId}`)
  return { success: true, data }
}

export async function activateOwnerAction(ownerId: string) {
  const { supabase } = await getAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('activate_owner', {
    p_owner_id: ownerId,
  })

  if (error) {
    console.error('activate_owner error:', error)
    return { error: error.message || 'Failed to activate owner' }
  }

  revalidatePath('/admin/owners')
  revalidatePath(`/admin/owners/${ownerId}`)
  return { success: true, data }
}

// ── RESTAURANT ACTIONS ─────────────────────────────────────────────────────

export async function suspendRestaurantAction(restaurantId: string) {
  const { supabase } = await getAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('suspend_restaurant', {
    p_restaurant_id: restaurantId,
  })

  if (error) {
    console.error('suspend_restaurant error:', error)
    return { error: error.message || 'Failed to suspend restaurant' }
  }

  revalidatePath('/admin/restaurants')
  revalidatePath('/admin/owners')
  return { success: true, data }
}

export async function activateRestaurantAction(restaurantId: string) {
  const { supabase } = await getAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('activate_restaurant', {
    p_restaurant_id: restaurantId,
  })

  if (error) {
    console.error('activate_restaurant error:', error)
    return { error: error.message || 'Failed to activate restaurant' }
  }

  revalidatePath('/admin/restaurants')
  revalidatePath('/admin/owners')
  return { success: true, data }
}

// ── STAFF ACTIONS ──────────────────────────────────────────────────────────

export async function disableStaffAction(staffId: string) {
  const { supabase } = await getAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('disable_staff_member', {
    p_staff_id: staffId,
  })

  if (error) {
    console.error('disable_staff_member error:', error)
    return { error: error.message || 'Failed to disable staff member' }
  }

  revalidatePath('/admin/owners')
  return { success: true, data }
}

export async function enableStaffAction(staffId: string) {
  const { supabase } = await getAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('enable_staff_member', {
    p_staff_id: staffId,
  })

  if (error) {
    console.error('enable_staff_member error:', error)
    return { error: error.message || 'Failed to enable staff member' }
  }

  revalidatePath('/admin/owners')
  return { success: true, data }
}
