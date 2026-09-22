'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireManager(restaurantId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Authorization is evaluated by Supabase using auth.uid(), not by a role
  // sent from the browser.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('is_restaurant_manager', {
    p_restaurant_id: restaurantId,
  })
  if (error || data !== true) throw new Error('Manager access required')
  return { supabase, user }
}

export async function saveCustomerProfile(input: {
  restaurantId: string
  customerId?: string
  name?: string
  phone?: string
  email?: string
  marketingConsent?: boolean
  smsConsent?: boolean
  tags?: string[]
  notes?: string
}) {
  const { supabase } = await requireManager(input.restaurantId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('upsert_customer_profile', {
    p_restaurant_id: input.restaurantId,
    p_customer_id: input.customerId ?? null,
    p_name: input.name ?? null,
    p_phone: input.phone ?? null,
    p_email: input.email ?? null,
    p_marketing_consent: input.marketingConsent ?? false,
    p_sms_consent: input.smsConsent ?? false,
    p_tags: input.tags ?? [],
    p_notes: input.notes ?? null,
  })
  if (error || data?.error) return { error: error?.message ?? data.error }
  revalidatePath(`/dashboard/${input.restaurantId}/crm`)
  return { success: true, customer: data }
}

export async function createReservationAction(input: {
  restaurantId: string
  branchId: string
  guestName: string
  guestPhone?: string
  guestEmail?: string
  partySize: number
  startsAt: string
  endsAt?: string
  notes?: string
}) {
  const { supabase } = await requireManager(input.restaurantId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('create_reservation', {
    p_restaurant_id: input.restaurantId,
    p_branch_id: input.branchId,
    p_guest_name: input.guestName,
    p_guest_phone: input.guestPhone ?? null,
    p_guest_email: input.guestEmail ?? null,
    p_party_size: input.partySize,
    p_starts_at: new Date(input.startsAt).toISOString(),
    p_ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
    p_notes: input.notes ?? null,
  })
  if (error || data?.error) return { error: error?.message ?? data.error }
  revalidatePath(`/dashboard/${input.restaurantId}/crm`)
  return { success: true, reservation: data }
}

export async function updateReservationStatusAction(input: { restaurantId: string; reservationId: string; status: string }) {
  const { supabase } = await requireManager(input.restaurantId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from as any)('reservations')
    .update({ status: input.status })
    .eq('id', input.reservationId)
    .eq('restaurant_id', input.restaurantId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/${input.restaurantId}/crm`)
  return { success: true }
}

export async function createCampaignAction(input: {
  restaurantId: string
  name: string
  channel: string
  subject?: string
  message: string
  scheduledAt?: string
}) {
  const { supabase, user } = await requireManager(input.restaurantId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from as any)('campaigns').insert({
    restaurant_id: input.restaurantId,
    name: input.name,
    channel: input.channel,
    subject: input.subject || null,
    message: input.message,
    scheduled_at: input.scheduledAt ? new Date(input.scheduledAt).toISOString() : null,
    status: input.scheduledAt ? 'scheduled' : 'draft',
    created_by: user.id,
  })
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/${input.restaurantId}/crm`)
  return { success: true }
}

export async function createInventoryItemAction(input: {
  restaurantId: string
  branchId?: string
  name: string
  sku?: string
  unit: string
  reorderLevel: number
  costPerUnit: number
}) {
  const { supabase } = await requireManager(input.restaurantId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from as any)('inventory_items').insert({
    restaurant_id: input.restaurantId,
    branch_id: input.branchId || null,
    name: input.name,
    sku: input.sku || null,
    unit: input.unit,
    reorder_level: input.reorderLevel,
    cost_per_unit: input.costPerUnit,
  })
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/${input.restaurantId}/crm`)
  return { success: true }
}

export async function adjustInventoryAction(input: {
  restaurantId: string
  inventoryItemId: string
  movementType: string
  quantity: number
  notes?: string
}) {
  const { supabase } = await requireManager(input.restaurantId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('adjust_inventory', {
    p_inventory_item_id: input.inventoryItemId,
    p_movement_type: input.movementType,
    p_quantity: input.quantity,
    p_notes: input.notes ?? null,
  })
  if (error || data?.error) return { error: error?.message ?? data.error }
  revalidatePath(`/dashboard/${input.restaurantId}/crm`)
  return { success: true }
}

export async function createShiftAction(input: {
  restaurantId: string
  branchId: string
  staffMemberId: string
  startsAt: string
  endsAt: string
  notes?: string
}) {
  const { supabase, user } = await requireManager(input.restaurantId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from as any)('staff_shifts').insert({
    restaurant_id: input.restaurantId,
    branch_id: input.branchId,
    staff_member_id: input.staffMemberId,
    starts_at: new Date(input.startsAt).toISOString(),
    ends_at: new Date(input.endsAt).toISOString(),
    notes: input.notes || null,
    created_by: user.id,
  })
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/${input.restaurantId}/crm`)
  return { success: true }
}
