import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Restaurant Owners — RestPilot Admin' }

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
  restaurants: Array<{ id: string; name: string; is_active: boolean }>
}

const PLAN_COLORS: Record<string, string> = {
  free: '#737373', standard: '#3B82F6', premium: '#F59E0B',
}
const STATUS_COLORS: Record<string, string> = {
  active: '#22C55E', trial: '#F59E0B', suspended: '#EF4444', cancelled: '#737373', expired: '#EF4444',
}

export default async function OwnersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileRaw } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profileRaw as { role: string } | null)?.role !== 'platform_admin') redirect('/dashboard')

  const { data: ownersRaw } = await supabase
    .from('owners')
    .select(`
      id, business_name, email, phone, subscription_plan, subscription_status,
      max_restaurants, is_active, created_at,
      profiles (full_name, role),
      restaurants (id, name, is_active)
    `)
    .order('created_at', { ascending: false })

  const owners = (ownersRaw as unknown as OwnerRow[]) ?? []
  const activeOwners = owners.filter(o => o.is_active).length

  return (
    <main className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Restaurant Owners</h1>
          <p className="page-subtitle">{activeOwners} active · {owners.length} total</p>
        </div>
        <Link href="/admin/owners/create" className="btn btn-primary">
          + Provision Owner
        </Link>
      </div>

      {owners.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <h2 className="empty-state-title">No Owners Yet</h2>
          <p className="empty-state-desc">Create your first restaurant owner to get started.</p>
          <Link href="/admin/owners/create" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-block' }}>
            + Provision First Owner
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {owners.map(owner => (
            <div
              key={owner.id}
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '20px',
                opacity: owner.is_active ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                {/* Avatar */}
                <div
                  style={{
                    width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #FF6B35, #8B5CF6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', fontWeight: 800, color: 'white',
                  }}
                >
                  {(owner.profiles?.full_name ?? owner.email ?? 'O')[0].toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#F5F5F5' }}>
                      {owner.profiles?.full_name ?? '—'}
                    </span>
                    {owner.business_name && (
                      <span style={{ fontSize: '0.78rem', color: '#737373' }}>· {owner.business_name}</span>
                    )}
                    <span
                      style={{
                        fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                        background: `${PLAN_COLORS[owner.subscription_plan] ?? '#737373'}18`,
                        color: PLAN_COLORS[owner.subscription_plan] ?? '#737373',
                        border: `1px solid ${PLAN_COLORS[owner.subscription_plan] ?? '#737373'}30`,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}
                    >
                      {owner.subscription_plan}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUS_COLORS[owner.subscription_status] ?? '#737373' }} />
                      <span style={{ fontSize: '0.72rem', color: STATUS_COLORS[owner.subscription_status] ?? '#737373', textTransform: 'capitalize' }}>
                        {owner.subscription_status}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', color: '#737373', flexWrap: 'wrap' }}>
                    {owner.email && <span>✉️ {owner.email}</span>}
                    {owner.phone && <span>📱 {owner.phone}</span>}
                    <span>🏪 {owner.restaurants.length} / {owner.max_restaurants} restaurants</span>
                    <span>Since {new Date(owner.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>

                  {/* Restaurants mini list */}
                  {owner.restaurants.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {owner.restaurants.map(r => (
                        <span
                          key={r.id}
                          style={{
                            fontSize: '0.72rem', padding: '3px 10px', borderRadius: '999px',
                            background: r.is_active ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${r.is_active ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'}`,
                            color: r.is_active ? '#86EFAC' : '#525252',
                          }}
                        >
                          🏪 {r.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <Link
                    href={`/admin/owners/${owner.id}`}
                    style={{
                      padding: '7px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                      border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                      color: '#A3A3A3', textDecoration: 'none',
                    }}
                  >
                    Manage →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
