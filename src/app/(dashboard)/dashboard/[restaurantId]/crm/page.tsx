import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CRMWorkspaceClient from './CRMWorkspaceClient'

export const metadata: Metadata = { title: 'CRM & Operations — RestPilot' }

export default async function CRMPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [restaurantResult, branchesResult, customersResult, reservationsResult, campaignsResult, inventoryResult, staffResult, shiftsResult, loyaltyResult, integrationsResult] = await Promise.all([
    supabase.from('restaurants').select('id, name, currency_symbol').eq('id', restaurantId).single(),
    supabase.from('branches').select('id, name').eq('restaurant_id', restaurantId).eq('is_active', true).order('is_main_branch', { ascending: false }),
    supabase.from('customers').select('id, name, phone, email, total_orders, total_spent, total_visits, loyalty_points, loyalty_tier, marketing_consent, sms_consent, tags, last_order_at').eq('restaurant_id', restaurantId).order('last_order_at', { ascending: false, nullsFirst: false }).limit(100),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any)('reservations').select('id, branch_id, guest_name, guest_phone, guest_email, party_size, starts_at, status, notes, confirmation_code, branches(name)').eq('restaurant_id', restaurantId).order('starts_at', { ascending: true }).limit(100),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any)('campaigns').select('id, name, channel, status, subject, message, scheduled_at, sent_at, created_at').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(100),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any)('inventory_items').select('id, branch_id, name, sku, unit, current_stock, reorder_level, cost_per_unit, is_active').eq('restaurant_id', restaurantId).order('name').limit(200),
    supabase.from('staff_members').select('id, branch_id, profile_id, role, profiles(full_name)').eq('restaurant_id', restaurantId).eq('is_active', true).order('role'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any)('staff_shifts').select('id, branch_id, staff_member_id, starts_at, ends_at, status, staff_members(role, profiles(full_name)), branches(name)').eq('restaurant_id', restaurantId).order('starts_at').limit(100),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any)('loyalty_accounts').select('id, customer_id, points_balance, lifetime_points, tier, customers(name, phone)').eq('restaurant_id', restaurantId).order('points_balance', { ascending: false }).limit(100),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any)('integration_connections').select('id, provider, status, public_config, last_synced_at, last_error').eq('restaurant_id', restaurantId).order('provider'),
  ])

  const restaurant = restaurantResult.data as { id: string; name: string; currency_symbol: string } | null
  if (!restaurant) redirect('/dashboard')

  return (
    <CRMWorkspaceClient
      restaurant={restaurant}
      branches={(branchesResult.data ?? []) as Array<{ id: string; name: string }>}
      customers={(customersResult.data ?? []) as unknown as CRMCustomer[]}
      reservations={(reservationsResult.data ?? []) as unknown as CRMReservation[]}
      campaigns={(campaignsResult.data ?? []) as unknown as CRMCampaign[]}
      inventory={(inventoryResult.data ?? []) as unknown as CRMInventory[]}
      staff={(staffResult.data ?? []) as unknown as CRMStaff[]}
      shifts={(shiftsResult.data ?? []) as unknown as CRMShift[]}
      loyalty={(loyaltyResult.data ?? []) as unknown as CRMLoyalty[]}
      integrations={(integrationsResult.data ?? []) as unknown as CRMIntegration[]}
    />
  )
}

export interface CRMCustomer { id: string; name: string | null; phone: string | null; email: string | null; total_orders: number; total_spent: number; total_visits: number; loyalty_points: number; loyalty_tier: string; marketing_consent: boolean; sms_consent: boolean; tags: string[]; last_order_at: string | null }
export interface CRMReservation { id: string; branch_id: string; guest_name: string; guest_phone: string | null; guest_email: string | null; party_size: number; starts_at: string; status: string; notes: string | null; confirmation_code: string; branches: { name: string } | null }
export interface CRMCampaign { id: string; name: string; channel: string; status: string; subject: string | null; message: string; scheduled_at: string | null; sent_at: string | null; created_at: string }
export interface CRMInventory { id: string; branch_id: string | null; name: string; sku: string | null; unit: string; current_stock: number; reorder_level: number; cost_per_unit: number; is_active: boolean }
export interface CRMStaff { id: string; branch_id: string | null; profile_id: string; role: string; profiles: { full_name: string | null } | null }
export interface CRMShift { id: string; branch_id: string; staff_member_id: string; starts_at: string; ends_at: string; status: string; staff_members: { role: string; profiles: { full_name: string | null } | null } | null; branches: { name: string } | null }
export interface CRMLoyalty { id: string; customer_id: string; points_balance: number; lifetime_points: number; tier: string; customers: { name: string | null; phone: string | null } | null }
export interface CRMIntegration { id: string; provider: string; status: string; public_config: Record<string, unknown>; last_synced_at: string | null; last_error: string | null }
