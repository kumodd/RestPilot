import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Manage Owner — RestPilot Admin' }

interface StaffRow {
  id: string
  role: string
  employee_code: string | null
  is_active: boolean
  joined_at: string
  permissions: Record<string, boolean>
  profiles: { full_name: string | null; phone: string | null } | null
  branches: { name: string } | null
}

interface RestaurantRow {
  id: string
  name: string
  slug: string
  is_active: boolean
  is_accepting_orders: boolean
  created_at: string
  staff_members: StaffRow[]
}

interface OwnerRow {
  id: string
  business_name: string | null
  email: string | null
  phone: string | null
  subscription_plan: string
  subscription_status: string
  max_restaurants: number
  is_active: boolean
  created_at: string
  profiles: { full_name: string | null; role: string } | null
}

const PLAN_COLORS: Record<string, string> = {
  free: '#737373', standard: '#3B82F6', premium: '#F59E0B',
}
const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  manager:          { label: 'Manager',         color: '#8B5CF6', icon: '👔' },
  waiter:           { label: 'Waiter',          color: '#3B82F6', icon: '🛎️' },
  chef:             { label: 'Chef',            color: '#FF6B35', icon: '👨‍🍳' },
  kitchen_manager:  { label: 'Kitchen Mgr',    color: '#F59E0B', icon: '🍳' },
  cashier:          { label: 'Cashier',         color: '#22C55E', icon: '💵' },
}

export default async function OwnerManagePage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileRaw } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profileRaw as { role: string } | null)?.role !== 'platform_admin') redirect('/dashboard')

  const { data: ownerRaw } = await supabase
    .from('owners')
    .select('id, business_name, email, phone, subscription_plan, subscription_status, max_restaurants, is_active, created_at, profiles (full_name, role)')
    .eq('id', ownerId)
    .single()

  if (!ownerRaw) notFound()
  const owner = ownerRaw as unknown as OwnerRow

  const { data: restaurantsRaw } = await supabase
    .from('restaurants')
    .select(`
      id, name, slug, is_active, is_accepting_orders, created_at,
      staff_members (
        id, role, employee_code, is_active, joined_at, permissions,
        profiles (full_name, phone),
        branches (name)
      )
    `)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })

  const restaurants = (restaurantsRaw as unknown as RestaurantRow[]) ?? []

  return (
    <main className="page-content">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link href="/admin/owners" style={{ color: '#737373', textDecoration: 'none', fontSize: '0.85rem' }}>← Owners</Link>
          </div>
          <h1 className="page-title" style={{ marginTop: '4px' }}>
            {owner.profiles?.full_name ?? owner.email ?? 'Owner'}
          </h1>
          <p className="page-subtitle">
            {owner.business_name && `${owner.business_name} · `}
            <span style={{ color: PLAN_COLORS[owner.subscription_plan] }}>{owner.subscription_plan}</span> plan ·
            {restaurants.length} / {owner.max_restaurants} restaurants
          </p>
        </div>
        <Link href={`/admin/owners/create`} className="btn btn-secondary">+ Add Restaurant</Link>
      </div>

      {/* Owner info card */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px',
          marginBottom: '28px',
        }}
      >
        {[
          { label: 'Email', value: owner.email ?? '—', icon: '✉️' },
          { label: 'Phone', value: owner.phone ?? '—', icon: '📱' },
          { label: 'Plan', value: owner.subscription_plan, icon: '💳' },
          { label: 'Status', value: owner.subscription_status, icon: '📊' },
          { label: 'Owner Since', value: new Date(owner.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), icon: '📅' },
        ].map(item => (
          <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px' }}>
            <p style={{ fontSize: '0.7rem', color: '#525252', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#F5F5F5' }}>{item.icon} {item.value}</p>
          </div>
        ))}
      </div>

      {/* Restaurants + their staff */}
      {restaurants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏪</div>
          <h2 className="empty-state-title">No Restaurants Yet</h2>
          <p className="empty-state-desc">This owner has no restaurants. Provision one for them.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {restaurants.map(restaurant => {
            const activeStaff = restaurant.staff_members.filter(s => s.is_active)
            return (
              <div
                key={restaurant.id}
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}
              >
                {/* Restaurant header */}
                <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: '#F5F5F5' }}>🏪 {restaurant.name}</span>
                      <span style={{ fontSize: '0.72rem', color: '#737373' }}>/{restaurant.slug}</span>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: restaurant.is_active ? '#22C55E' : '#EF4444', display: 'inline-block' }} />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '2px' }}>
                      {activeStaff.length} active staff · Created {new Date(restaurant.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span
                      style={{
                        padding: '4px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                        background: restaurant.is_accepting_orders ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        color: restaurant.is_accepting_orders ? '#22C55E' : '#EF4444',
                        border: `1px solid ${restaurant.is_accepting_orders ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      }}
                    >
                      {restaurant.is_accepting_orders ? 'Accepting Orders' : 'Paused'}
                    </span>
                  </div>
                </div>

                {/* Staff table */}
                <div style={{ padding: '0' }}>
                  {restaurant.staff_members.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#525252', fontSize: '0.85rem' }}>
                      No staff members yet.
                    </div>
                  ) : (
                    restaurant.staff_members.map((member, idx) => {
                      const cfg = ROLE_CONFIG[member.role] ?? { label: member.role, color: '#737373', icon: '👤' }
                      const perms = member.permissions ?? {}
                      const permKeys = Object.keys(perms).filter(k => perms[k])
                      return (
                        <div
                          key={member.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '14px',
                            padding: '12px 20px',
                            borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                            opacity: member.is_active ? 1 : 0.45,
                          }}
                        >
                          <div
                            style={{
                              width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                              background: `linear-gradient(135deg, ${cfg.color}60, ${cfg.color}30)`,
                              border: `2px solid ${cfg.color}40`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.75rem', fontWeight: 800, color: 'white',
                            }}
                          >
                            {String(member.profiles?.full_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#F5F5F5' }}>{member.profiles?.full_name ?? '—'}</span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                                {cfg.icon} {cfg.label}
                              </span>
                              {!member.is_active && <span style={{ fontSize: '0.65rem', color: '#525252' }}>Inactive</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem', color: '#737373' }}>
                              {member.profiles?.phone && <span>{member.profiles.phone}</span>}
                              {member.branches?.name && <span>🏢 {member.branches.name}</span>}
                              {member.employee_code && <span>🪪 {member.employee_code}</span>}
                            </div>
                            {permKeys.length > 0 && (
                              <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                {permKeys.slice(0, 5).map(k => (
                                  <span key={k} style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: '999px', background: 'rgba(139,92,246,0.1)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.2)' }}>
                                    {k}
                                  </span>
                                ))}
                                {permKeys.length > 5 && <span style={{ fontSize: '0.62rem', color: '#525252' }}>+{permKeys.length - 5} more</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
