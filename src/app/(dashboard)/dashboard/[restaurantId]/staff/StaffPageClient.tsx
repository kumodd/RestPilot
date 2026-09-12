'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types/database.types'

// ─── Permission definitions ────────────────────────────────
export const PERMISSION_GROUPS: Array<{
  group: string
  icon: string
  permissions: Array<{ key: string; label: string; desc: string; roles: UserRole[] }>
}> = [
  {
    group: 'Orders',
    icon: '📋',
    permissions: [
      { key: 'view_orders',       label: 'View Orders',        desc: 'See live order board',                    roles: ['manager', 'waiter', 'chef', 'kitchen_manager', 'cashier'] },
      { key: 'confirm_orders',    label: 'Confirm Orders',     desc: 'Approve/reject customer orders',          roles: ['manager', 'waiter'] },
      { key: 'advance_status',    label: 'Advance Status',     desc: 'Move orders through kitchen workflow',    roles: ['manager', 'chef', 'kitchen_manager'] },
      { key: 'cancel_orders',     label: 'Cancel Orders',      desc: 'Cancel in-progress orders',              roles: ['manager'] },
      { key: 'add_items',         label: 'Add Items to Order', desc: 'Add items on behalf of customer',        roles: ['manager', 'waiter'] },
    ],
  },
  {
    group: 'Menu',
    icon: '🍽️',
    permissions: [
      { key: 'view_menu',         label: 'View Menu',          desc: 'Read menu categories and items',         roles: ['manager', 'waiter', 'chef', 'kitchen_manager', 'cashier'] },
      { key: 'edit_menu',         label: 'Edit Menu',          desc: 'Add/edit/delete menu items',             roles: ['manager'] },
      { key: 'toggle_availability', label: 'Toggle Availability', desc: 'Mark items available/unavailable',   roles: ['manager', 'kitchen_manager'] },
    ],
  },
  {
    group: 'Tables',
    icon: '🪑',
    permissions: [
      { key: 'view_tables',       label: 'View Tables',        desc: 'See table status and sessions',          roles: ['manager', 'waiter'] },
      { key: 'manage_tables',     label: 'Manage Tables',      desc: 'Add/edit tables and generate QR codes',  roles: ['manager'] },
    ],
  },
  {
    group: 'Staff',
    icon: '👥',
    permissions: [
      { key: 'view_staff',        label: 'View Staff',         desc: 'See staff list',                         roles: ['manager'] },
      { key: 'manage_staff',      label: 'Manage Staff',       desc: 'Invite, edit, and deactivate staff',     roles: ['manager'] },
    ],
  },
  {
    group: 'Reports',
    icon: '📊',
    permissions: [
      { key: 'view_reports',      label: 'View Reports',       desc: 'Access sales and order analytics',       roles: ['manager'] },
      { key: 'export_reports',    label: 'Export Reports',     desc: 'Download report data',                   roles: ['manager'] },
    ],
  },
  {
    group: 'Settings',
    icon: '⚙️',
    permissions: [
      { key: 'view_settings',     label: 'View Settings',      desc: 'View restaurant settings',               roles: ['manager'] },
      { key: 'edit_settings',     label: 'Edit Settings',      desc: 'Modify restaurant settings and charges', roles: ['manager'] },
    ],
  },
  {
    group: 'Kitchen',
    icon: '👨‍🍳',
    permissions: [
      { key: 'kitchen_display',   label: 'Kitchen Display',    desc: 'Access KDS kitchen view',                roles: ['manager', 'chef', 'kitchen_manager'] },
      { key: 'mark_item_ready',   label: 'Mark Items Ready',   desc: 'Check off prepared items',               roles: ['manager', 'chef', 'kitchen_manager'] },
    ],
  },
]

// Default permissions for each role
const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  manager:         ['view_orders', 'confirm_orders', 'advance_status', 'cancel_orders', 'add_items', 'view_menu', 'edit_menu', 'toggle_availability', 'view_tables', 'manage_tables', 'view_staff', 'manage_staff', 'view_reports', 'export_reports', 'view_settings', 'edit_settings', 'kitchen_display', 'mark_item_ready'],
  waiter:          ['view_orders', 'confirm_orders', 'add_items', 'view_menu', 'view_tables'],
  chef:            ['view_orders', 'advance_status', 'view_menu', 'kitchen_display', 'mark_item_ready'],
  kitchen_manager: ['view_orders', 'advance_status', 'view_menu', 'toggle_availability', 'kitchen_display', 'mark_item_ready'],
  cashier:         ['view_orders', 'view_menu', 'view_reports'],
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  manager:         { label: 'Manager',         color: '#8B5CF6', icon: '👔' },
  waiter:          { label: 'Waiter',          color: '#3B82F6', icon: '🛎️' },
  chef:            { label: 'Chef',            color: '#FF6B35', icon: '👨‍🍳' },
  kitchen_manager: { label: 'Kitchen Manager', color: '#F59E0B', icon: '🍳' },
  cashier:         { label: 'Cashier',         color: '#22C55E', icon: '💵' },
}

interface StaffMember {
  id: string
  role: UserRole
  employee_code: string | null
  is_active: boolean
  joined_at: string
  branch_id: string | null
  permissions: Record<string, boolean>
  profiles: { full_name: string | null; phone: string | null; avatar_url: string | null } | null
  branches: { name: string } | null
}

interface Props {
  staff: StaffMember[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invitations: any[]
  branches: Array<{ id: string; name: string }>
  restaurantId: string
  currentUserId: string
}

type ModalState =
  | { type: 'none' }
  | { type: 'invite' }
  | { type: 'permissions'; member: StaffMember }

export default function StaffPageClient({ staff: initial, invitations: initialInvitations, branches, restaurantId, currentUserId }: Props) {
  const supabase = createClient()
  const [staff, setStaff] = useState<StaffMember[]>(initial)
  const [invitations, setInvitations] = useState<any[]>(initialInvitations)
  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [filterRole, setFilterRole] = useState<string>('all')

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('waiter')
  const [inviteBranch, setInviteBranch] = useState(branches[0]?.id ?? '')
  const [inviteCode, setInviteCode] = useState('')
  const [invitePerms, setInvitePerms] = useState<Record<string, boolean>>({})
  const [isInviting, setIsInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error' | 'invite'; text: string } | null>(null)

  // Permission editor state
  const [editPerms, setEditPerms] = useState<Record<string, boolean>>({})
  const [isSavingPerms, setIsSavingPerms] = useState(false)

  const refresh = async () => {
    const { data: staffData } = await supabase
      .from('staff_members')
      .select(`id, role, employee_code, is_active, joined_at, branch_id, permissions,
        profiles (full_name, phone, avatar_url), branches (name)`)
      .eq('restaurant_id', restaurantId)
      .order('joined_at', { ascending: false })
    
    // Use server action to bypass RLS issues for the owner
    const { getPendingInvitations } = await import('@/app/actions/invitation')
    const invData = await getPendingInvitations(restaurantId)

    setStaff((staffData as unknown as StaffMember[]) ?? [])
    setInvitations(invData ?? [])
  }

  // Load default permissions when role changes in invite form
  const onInviteRoleChange = (role: UserRole) => {
    setInviteRole(role)
    const defaults = ROLE_DEFAULT_PERMISSIONS[role] ?? []
    setInvitePerms(Object.fromEntries(defaults.map(k => [k, true])))
  }

  const openInvite = () => {
    onInviteRoleChange('waiter')
    setInviteMsg(null)
    setModal({ type: 'invite' })
  }

  const openPermissions = (member: StaffMember) => {
    setEditPerms({ ...(member.permissions ?? {}) })
    setModal({ type: 'permissions', member })
  }

  const toggleActive = async (member: StaffMember) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('staff_members') as any).update({ is_active: !member.is_active }).eq('id', member.id)
    await refresh()
  }

  // ── Invite/add staff ──────────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsInviting(true)
    setInviteMsg(null)

    try {
      // Import the server action at the top of the file or use fetch if it's an API route. 
      // Actually, since this is a client component, we'll need to pass the action in via props or import it directly.
      // Wait, we can import server actions in client components in Next.js 13+!
      const { createInvitation } = await import('@/app/actions/invitation')
      
      const token = await createInvitation(restaurantId, inviteRole, inviteEmail)
      const inviteUrl = `${window.location.origin}/auth/accept-invite?token=${token}`
      
      setInviteMsg({ 
        type: 'success', 
        text: `Invitation created successfully! The magic link is: ${inviteUrl}` 
      })

      // Normally we'd send an email here instead of showing the link.

      await refresh()
      setTimeout(() => setModal({ type: 'none' }), 8000)
    } catch (err: any) {
      setInviteMsg({ type: 'error', text: err.message || 'Failed to create invitation' })
    } finally {
      setIsInviting(false)
    }
  }

  // ── Save permissions ──────────────────────────────────────
  const savePermissions = async () => {
    if (modal.type !== 'permissions') return
    setIsSavingPerms(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('staff_members') as any).update({ permissions: editPerms }).eq('id', modal.member.id)
    await refresh()
    setIsSavingPerms(false)
    setModal({ type: 'none' })
  }

  const filtered = filterRole === 'all' ? staff : staff.filter(s => s.role === filterRole)
  const counts = Object.keys(ROLE_CONFIG).reduce((acc: Record<string, number>, role) => {
    acc[role] = staff.filter(s => s.role === role).length; return acc
  }, {})

  return (
    <main className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff & Permissions</h1>
          <p className="page-subtitle">{staff.filter(s => s.is_active).length} active · {staff.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={openInvite}>+ Add Staff</button>
      </div>

      {/* Role filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {[{ value: 'all', label: `All (${staff.length})`, color: '#FF6B35' },
          ...Object.entries(ROLE_CONFIG).map(([role, cfg]) => ({
            value: role, label: `${cfg.icon} ${cfg.label}${counts[role] ? ` (${counts[role]})` : ''}`, color: cfg.color,
          }))
        ].map(item => (
          <button
            key={item.value}
            onClick={() => setFilterRole(item.value)}
            style={{
              padding: '6px 14px', borderRadius: '999px', border: '1.5px solid',
              borderColor: filterRole === item.value ? item.color : 'rgba(255,255,255,0.1)',
              background: filterRole === item.value ? `${item.color}18` : 'transparent',
              color: filterRole === item.value ? item.color : '#737373',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#F5F5F5', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#F59E0B' }}>⏳</span> Pending Invitations ({invitations.length})
          </h2>
          <div style={{ background: 'rgba(245,158,11,0.03)', border: '1px dashed rgba(245,158,11,0.3)', borderRadius: '16px', overflow: 'hidden' }}>
            {invitations.map((inv, idx) => {
              const cfg = ROLE_CONFIG[inv.role] ?? { label: inv.role, color: '#737373', icon: '👤' }
              return (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px',
                    padding: '14px 20px',
                    borderTop: idx > 0 ? '1px dashed rgba(245,158,11,0.2)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                      ✉️
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#FCD34D' }}>{inv.email}</span>
                        <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#A3A3A3' }}>
                        Sent {new Date(inv.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={async () => {
                        await supabase.from('invitations').delete().eq('id', inv.id)
                        await refresh()
                      }}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      title="Revoke Invitation"
                    >
                      Revoke
                    </button>
                    
                    <a
                      href={`mailto:${inv.email}?subject=You've been invited to join RestPilot&body=Hello,%0D%0A%0D%0AYou have been invited to join RestPilot as a ${ROLE_CONFIG[inv.role]?.label || inv.role}.%0D%0A%0D%0AClick the link below to accept your invitation:%0D%0A${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/accept-invite?token=${inv.token}`)}`}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.06)', color: '#A78BFA', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                      title="Send Email"
                    >
                      📧 Email
                    </a>

                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`You've been invited to join RestPilot! Click here to accept: ${typeof window !== 'undefined' ? window.location.origin : ''}/auth/accept-invite?token=${inv.token}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)', color: '#22C55E', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                      title="Share via WhatsApp"
                    >
                      💬 WhatsApp
                    </a>

                    <button
                      onClick={() => {
                        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/accept-invite?token=${inv.token}`
                        navigator.clipboard.writeText(url)
                        alert('Magic link copied to clipboard!')
                      }}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.06)', color: '#60A5FA', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      title="Copy Link"
                    >
                      🔗 Copy Link
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Staff list */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h2 className="empty-state-title">No Staff Members</h2>
          <p className="empty-state-desc">Add your first team member to get started.</p>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={openInvite}>+ Add Staff</button>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
          {filtered.map((member, idx) => {
            const cfg = ROLE_CONFIG[member.role] ?? { label: member.role, color: '#737373', icon: '👤' }
            const name = member.profiles?.full_name ?? 'Unknown'
            const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            const permCount = Object.values(member.permissions ?? {}).filter(Boolean).length

            return (
              <div
                key={member.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 20px',
                  borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  opacity: member.is_active ? 1 : 0.5,
                }}
              >
                <div
                  style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${cfg.color}80, ${cfg.color}40)`,
                    border: `2px solid ${cfg.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.82rem', fontWeight: 700, color: 'white',
                  }}
                >
                  {initials}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#F5F5F5' }}>{name}</span>
                    <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                      {cfg.icon} {cfg.label}
                    </span>
                    {!member.is_active && <span style={{ fontSize: '0.66rem', color: '#737373' }}>Inactive</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', color: '#737373', flexWrap: 'wrap' }}>
                    {member.profiles?.phone && <span>📱 {member.profiles.phone}</span>}
                    {member.branches?.name && <span>🏢 {member.branches.name}</span>}
                    {member.employee_code && <span>🪪 {member.employee_code}</span>}
                    <button
                      onClick={() => openPermissions(member)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        color: permCount > 0 ? '#A78BFA' : '#525252', fontSize: '0.75rem', fontWeight: 600,
                      }}
                    >
                      🔐 {permCount} permission{permCount !== 1 ? 's' : ''} →
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => openPermissions(member)}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.06)', color: '#A78BFA', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Permissions
                  </button>
                  <button
                    onClick={() => toggleActive(member)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', border: '1px solid',
                      borderColor: member.is_active ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
                      background: member.is_active ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)',
                      color: member.is_active ? '#EF4444' : '#22C55E',
                      fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {member.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Invite Modal ── */}
      {modal.type === 'invite' && (
        <>
          <div className="modal-overlay" onClick={() => setModal({ type: 'none' })} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', zIndex: 1001, boxShadow: '0 16px 64px rgba(0,0,0,0.6)', animation: 'scaleIn 0.2s ease' }}>
            <div style={{ padding: '24px 24px 0' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F5F5F5', marginBottom: '20px' }}>👥 Add Staff Member</h2>
            </div>

            {inviteMsg ? (
              <div style={{ padding: '20px 24px 24px' }}>
                <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '20px', background: inviteMsg.type === 'success' ? 'rgba(34,197,94,0.08)' : inviteMsg.type === 'invite' ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${inviteMsg.type === 'success' ? 'rgba(34,197,94,0.2)' : inviteMsg.type === 'invite' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`, color: inviteMsg.type === 'success' ? '#86EFAC' : inviteMsg.type === 'invite' ? '#FCD34D' : '#FCA5A5', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  {inviteMsg.type === 'invite' ? '📧 ' : inviteMsg.type === 'success' ? '✅ ' : '⚠️ '}{inviteMsg.text}
                </div>
                {inviteMsg.type !== 'success' && (
                  <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setInviteMsg(null)}>← Back</button>
                )}
              </div>
            ) : (
              <form onSubmit={handleInvite} style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input type="email" className="form-input" placeholder="staff@restaurant.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required autoFocus />
                </div>

                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select className="form-select" value={inviteRole} onChange={e => onInviteRoleChange(e.target.value as UserRole)}>
                    {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                      <option key={role} value={role}>{cfg.icon} {cfg.label}</option>
                    ))}
                  </select>
                </div>
                
                <p style={{ fontSize: '0.8rem', color: '#737373', marginTop: '4px' }}>
                  Branch assignment and specific permissions can be configured after the staff member accepts the invitation.
                </p>

                <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button type="button" className="btn btn-secondary flex-1" onClick={() => setModal({ type: 'none' })}>Cancel</button>
                  <button type="submit" className="btn btn-primary flex-1" disabled={isInviting || !inviteEmail}>
                    {isInviting ? 'Sending Invite...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}

      {/* ── Permissions Editor Modal ── */}
      {modal.type === 'permissions' && (
        <>
          <div className="modal-overlay" onClick={() => setModal({ type: 'none' })} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', zIndex: 1001, boxShadow: '0 16px 64px rgba(0,0,0,0.6)', animation: 'scaleIn 0.2s ease' }}>
            {/* Header */}
            <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F5F5F5' }}>
                🔐 Permissions — {modal.member.profiles?.full_name ?? 'Staff Member'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#737373', marginTop: '3px' }}>
                {ROLE_CONFIG[modal.member.role]?.icon} {ROLE_CONFIG[modal.member.role]?.label ?? modal.member.role} ·
                {Object.values(editPerms).filter(Boolean).length} permissions granted
              </p>
              {/* Quick presets */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: '#525252', alignSelf: 'center' }}>Presets:</span>
                {['manager', 'waiter', 'chef', 'kitchen_manager', 'cashier'].map(role => (
                  <button
                    key={role}
                    onClick={() => {
                      const defaults = ROLE_DEFAULT_PERMISSIONS[role] ?? []
                      setEditPerms(Object.fromEntries(defaults.map(k => [k, true])))
                    }}
                    style={{ padding: '4px 10px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#A3A3A3', fontSize: '0.72rem', cursor: 'pointer' }}
                  >
                    {ROLE_CONFIG[role]?.icon} {ROLE_CONFIG[role]?.label}
                  </button>
                ))}
                <button onClick={() => setEditPerms({})} style={{ padding: '4px 10px', borderRadius: '999px', border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#EF4444', fontSize: '0.72rem', cursor: 'pointer' }}>
                  Clear All
                </button>
              </div>
            </div>

            {/* Permission groups */}
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {PERMISSION_GROUPS.map(group => (
                <div key={group.group}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {group.icon} {group.group}
                    </p>
                    <button
                      onClick={() => {
                        const allOn = group.permissions.every(p => editPerms[p.key])
                        setEditPerms(prev => ({ ...prev, ...Object.fromEntries(group.permissions.map(p => [p.key, !allOn])) }))
                      }}
                      style={{ fontSize: '0.68rem', color: '#737373', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {group.permissions.every(p => editPerms[p.key]) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {group.permissions.map(perm => (
                      <label
                        key={perm.key}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '9px', cursor: 'pointer',
                          padding: '9px 10px', borderRadius: '10px',
                          background: editPerms[perm.key] ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${editPerms[perm.key] ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.05)'}`,
                          transition: 'all 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!editPerms[perm.key]}
                          onChange={e => setEditPerms(prev => ({ ...prev, [perm.key]: e.target.checked }))}
                          style={{ accentColor: '#8B5CF6', width: '14px', height: '14px', marginTop: '2px', flexShrink: 0 }}
                        />
                        <div>
                          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: editPerms[perm.key] ? '#E9D5FF' : '#A3A3A3' }}>{perm.label}</p>
                          <p style={{ fontSize: '0.68rem', color: '#525252', lineHeight: 1.3 }}>{perm.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary flex-1" onClick={() => setModal({ type: 'none' })}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={savePermissions} disabled={isSavingPerms}>
                {isSavingPerms ? 'Saving...' : '💾 Save Permissions'}
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
