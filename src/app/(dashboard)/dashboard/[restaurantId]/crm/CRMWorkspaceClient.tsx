'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  adjustInventoryAction,
  createCampaignAction,
  createInventoryItemAction,
  createReservationAction,
  createShiftAction,
  saveCustomerProfile,
  updateReservationStatusAction,
} from '@/app/actions/crm'
import type { CRMCampaign, CRMCustomer, CRMIntegration, CRMInventory, CRMLoyalty, CRMReservation, CRMShift, CRMStaff } from './page'

type Tab = 'customers' | 'loyalty' | 'campaigns' | 'reservations' | 'inventory' | 'workforce' | 'integrations'

const inputStyle = { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F5F5F5' }
const buttonStyle = { padding: '9px 14px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card" style={{ marginBottom: '20px' }}><h2 className="section-title" style={{ marginBottom: '16px' }}>{title}</h2>{children}</section>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#A1A1AA' }}>{label}{children}</label>
}

export default function CRMWorkspaceClient({
  restaurant, branches, customers, reservations, campaigns, inventory, staff, shifts, loyalty, integrations,
}: {
  restaurant: { id: string; name: string; currency_symbol: string }
  branches: Array<{ id: string; name: string }>
  customers: CRMCustomer[]
  reservations: CRMReservation[]
  campaigns: CRMCampaign[]
  inventory: CRMInventory[]
  staff: CRMStaff[]
  shifts: CRMShift[]
  loyalty: CRMLoyalty[]
  integrations: CRMIntegration[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('customers')
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const run = async (action: () => Promise<{ error?: string }>) => {
    setIsSaving(true); setMessage(null)
    try {
      const result = await action()
      if (result.error) setMessage(`⚠️ ${result.error}`)
      else { setMessage('✅ Saved successfully'); router.refresh() }
    } catch (error) { setMessage(`⚠️ ${error instanceof Error ? error.message : 'Unable to save'}`) }
    finally { setIsSaving(false) }
  }

  const tabs: Array<[Tab, string]> = [
    ['customers', '👥 Customers'], ['loyalty', '⭐ Loyalty'], ['campaigns', '📣 Campaigns'],
    ['reservations', '📅 Reservations'], ['inventory', '📦 Inventory'], ['workforce', '🧑‍🍳 Workforce'], ['integrations', '🔌 Integrations'],
  ]

  return (
    <main className="page-content" style={{ maxWidth: '1280px' }}>
      <div className="page-header">
        <div><h1 className="page-title">CRM & Operations</h1><p className="page-subtitle">{restaurant.name} · one workspace for guest relationships and daily operations</p></div>
        {message && <div style={{ padding: '9px 12px', borderRadius: '8px', background: message.startsWith('⚠️') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: message.startsWith('⚠️') ? '#FCA5A5' : '#86EFAC', fontSize: '0.8rem' }}>{message}</div>}
      </div>

      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '18px' }}>
        {tabs.map(([id, label]) => <button type="button" key={id} onClick={() => setActiveTab(id)} style={{ ...buttonStyle, whiteSpace: 'nowrap', background: activeTab === id ? '#FF6B35' : 'rgba(255,255,255,0.06)', color: activeTab === id ? 'white' : '#A1A1AA' }}>{label}</button>)}
      </div>

      {activeTab === 'customers' && <CustomersTab restaurantId={restaurant.id} customers={customers} run={run} isSaving={isSaving} />}
      {activeTab === 'loyalty' && <LoyaltyTab currency={restaurant.currency_symbol} loyalty={loyalty} customers={customers} />}
      {activeTab === 'campaigns' && <CampaignsTab restaurantId={restaurant.id} campaigns={campaigns} run={run} isSaving={isSaving} />}
      {activeTab === 'reservations' && <ReservationsTab restaurantId={restaurant.id} branches={branches} reservations={reservations} run={run} isSaving={isSaving} />}
      {activeTab === 'inventory' && <InventoryTab restaurantId={restaurant.id} branches={branches} inventory={inventory} run={run} isSaving={isSaving} />}
      {activeTab === 'workforce' && <WorkforceTab restaurantId={restaurant.id} branches={branches} staff={staff} shifts={shifts} run={run} isSaving={isSaving} />}
      {activeTab === 'integrations' && <IntegrationsTab integrations={integrations} />}
    </main>
  )
}

function CustomersTab({ restaurantId, customers, run, isSaving }: { restaurantId: string; customers: CRMCustomer[]; run: (action: () => Promise<{ error?: string }>) => Promise<void>; isSaving: boolean }) {
  const [query, setQuery] = useState('')
  const filtered = customers.filter(customer => `${customer.name ?? ''} ${customer.phone ?? ''} ${customer.email ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  return <>
    <Panel title="Add or update customer">
      <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(() => saveCustomerProfile({ restaurantId, name: String(form.get('name') || ''), phone: String(form.get('phone') || ''), email: String(form.get('email') || ''), tags: String(form.get('tags') || '').split(',').map(value => value.trim()).filter(Boolean), notes: String(form.get('notes') || ''), marketingConsent: form.get('marketing') === 'on', smsConsent: form.get('sms') === 'on' })) }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <Field label="Name"><input name="name" required style={inputStyle} /></Field><Field label="Phone"><input name="phone" style={inputStyle} /></Field><Field label="Email"><input name="email" type="email" style={inputStyle} /></Field><Field label="Tags"><input name="tags" placeholder="vip, family" style={inputStyle} /></Field>
        </div>
        <div style={{ display: 'flex', gap: '18px', marginTop: '14px', alignItems: 'center', flexWrap: 'wrap' }}><Field label="Notes"><input name="notes" style={{ ...inputStyle, minWidth: '280px' }} /></Field><label style={{ color: '#A1A1AA', fontSize: '0.8rem' }}><input name="marketing" type="checkbox" /> Marketing consent</label><label style={{ color: '#A1A1AA', fontSize: '0.8rem' }}><input name="sms" type="checkbox" /> SMS consent</label><button style={buttonStyle} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save customer'}</button></div>
      </form>
    </Panel>
    <Panel title={`Customer 360 · ${customers.length} profiles`}>
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, phone or email" style={{ ...inputStyle, maxWidth: '380px', marginBottom: '14px' }} />
      <div style={{ overflowX: 'auto' }}><table className="tracking-table"><thead><tr><th>Customer</th><th>Contact</th><th>Visits</th><th>Orders</th><th>Spend</th><th>Loyalty</th><th>Consent</th></tr></thead><tbody>{filtered.map(customer => <tr key={customer.id}><td><strong>{customer.name || 'Guest'}</strong><div style={{ color: '#737373', fontSize: '0.7rem' }}>{customer.tags?.join(' · ')}</div></td><td>{customer.phone || '—'}<br />{customer.email || '—'}</td><td>{customer.total_visits ?? 0}</td><td>{customer.total_orders}</td><td>{customer.total_spent.toLocaleString('en-IN')}</td><td>{customer.loyalty_points ?? 0} pts · {customer.loyalty_tier}</td><td>{customer.marketing_consent ? 'Marketing' : '—'} {customer.sms_consent ? 'SMS' : ''}</td></tr>)}</tbody></table></div>
    </Panel>
  </>
}

function LoyaltyTab({ currency, loyalty, customers }: { currency: string; loyalty: CRMLoyalty[]; customers: CRMCustomer[] }) {
  const points = loyalty.reduce((sum, account) => sum + account.points_balance, 0)
  return <><div className="stats-grid"><div className="stat-card" style={{ '--stat-color': '#F59E0B' } as React.CSSProperties}><div className="stat-value">{loyalty.length}</div><div className="stat-label">Members</div></div><div className="stat-card" style={{ '--stat-color': '#8B5CF6' } as React.CSSProperties}><div className="stat-value">{points}</div><div className="stat-label">Points outstanding</div></div><div className="stat-card" style={{ '--stat-color': '#22C55E' } as React.CSSProperties}><div className="stat-value">{customers.filter(customer => customer.loyalty_tier === 'vip').length}</div><div className="stat-label">VIP customers</div></div></div><Panel title="Loyalty ledger"><p className="empty-state-desc" style={{ marginBottom: '14px' }}>Customers earn 1 point per {currency}100 on completed orders. Every award is recorded against the order for auditability.</p>{loyalty.length === 0 ? <p className="empty-state-desc">No loyalty members yet. Complete a customer order to create the first account.</p> : <table className="tracking-table"><thead><tr><th>Customer</th><th>Tier</th><th>Balance</th><th>Lifetime</th></tr></thead><tbody>{loyalty.map(account => <tr key={account.id}><td>{account.customers?.name || 'Guest'}<br /><small>{account.customers?.phone || ''}</small></td><td>{account.tier}</td><td>{account.points_balance}</td><td>{account.lifetime_points}</td></tr>)}</tbody></table>}</Panel></>
}

function CampaignsTab({ restaurantId, campaigns, run, isSaving }: { restaurantId: string; campaigns: CRMCampaign[]; run: (action: () => Promise<{ error?: string }>) => Promise<void>; isSaving: boolean }) {
  return <><Panel title="Create campaign"><form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(() => createCampaignAction({ restaurantId, name: String(form.get('name') || ''), channel: String(form.get('channel') || 'in_app'), subject: String(form.get('subject') || ''), message: String(form.get('message') || ''), scheduledAt: String(form.get('scheduledAt') || '') || undefined })) }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr', gap: '12px' }}><Field label="Campaign name"><input name="name" required style={inputStyle} placeholder="Weekend win-back" /></Field><Field label="Channel"><select name="channel" style={inputStyle}><option value="in_app">In-app</option><option value="email">Email</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="push">Push</option></select></Field><Field label="Subject"><input name="subject" style={inputStyle} /></Field></div><Field label="Message"><textarea name="message" required rows={3} style={{ ...inputStyle, marginTop: '12px' }} placeholder="A personal offer for guests who have not visited recently…" /></Field><div style={{ display: 'flex', gap: '12px', alignItems: 'end', marginTop: '12px' }}><Field label="Schedule (optional)"><input name="scheduledAt" type="datetime-local" style={inputStyle} /></Field><button style={buttonStyle} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save campaign'}</button></div></form></Panel><Panel title="Campaign history">{campaigns.length === 0 ? <p className="empty-state-desc">No campaigns yet.</p> : <table className="tracking-table"><thead><tr><th>Name</th><th>Channel</th><th>Status</th><th>Scheduled</th></tr></thead><tbody>{campaigns.map(campaign => <tr key={campaign.id}><td><strong>{campaign.name}</strong><br /><small>{campaign.message}</small></td><td>{campaign.channel}</td><td>{campaign.status}</td><td>{campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleString() : 'Draft'}</td></tr>)}</tbody></table>}</Panel></>
}

function ReservationsTab({ restaurantId, branches, reservations, run, isSaving }: { restaurantId: string; branches: Array<{ id: string; name: string }>; reservations: CRMReservation[]; run: (action: () => Promise<{ error?: string }>) => Promise<void>; isSaving: boolean }) {
  return <><Panel title="New reservation"><form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(() => createReservationAction({ restaurantId, branchId: String(form.get('branchId') || ''), guestName: String(form.get('guestName') || ''), guestPhone: String(form.get('guestPhone') || ''), guestEmail: String(form.get('guestEmail') || ''), partySize: Number(form.get('partySize') || 1), startsAt: String(form.get('startsAt') || ''), endsAt: String(form.get('endsAt') || '') || undefined, notes: String(form.get('notes') || '') })) }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 150px 1fr 1fr', gap: '12px' }}><Field label="Guest"><input name="guestName" required style={inputStyle} /></Field><Field label="Phone"><input name="guestPhone" style={inputStyle} /></Field><Field label="Party"><input name="partySize" type="number" min="1" max="100" defaultValue="2" style={inputStyle} /></Field><Field label="Branch"><select name="branchId" required style={inputStyle}>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field><Field label="Starts"><input name="startsAt" type="datetime-local" required style={inputStyle} /></Field></div><div style={{ display: 'flex', gap: '12px', alignItems: 'end', marginTop: '12px' }}><Field label="Email"><input name="guestEmail" type="email" style={inputStyle} /></Field><Field label="Notes"><input name="notes" style={{ ...inputStyle, minWidth: '260px' }} /></Field><button style={buttonStyle} disabled={isSaving}>Create reservation</button></div></form></Panel><Panel title={`Upcoming reservations · ${reservations.length}`}><table className="tracking-table"><thead><tr><th>Guest</th><th>When</th><th>Branch</th><th>Party</th><th>Status</th><th>Action</th></tr></thead><tbody>{reservations.map(reservation => <tr key={reservation.id}><td><strong>{reservation.guest_name}</strong><br /><small>{reservation.guest_phone || reservation.guest_email || reservation.confirmation_code}</small></td><td>{new Date(reservation.starts_at).toLocaleString()}</td><td>{reservation.branches?.name || '—'}</td><td>{reservation.party_size}</td><td>{reservation.status}</td><td>{reservation.status === 'requested' && <button type="button" style={buttonStyle} onClick={() => void run(() => updateReservationStatusAction({ restaurantId, reservationId: reservation.id, status: 'confirmed' }))}>Confirm</button>}</td></tr>)}</tbody></table></Panel></>
}

function InventoryTab({ restaurantId, branches, inventory, run, isSaving }: { restaurantId: string; branches: Array<{ id: string; name: string }>; inventory: CRMInventory[]; run: (action: () => Promise<{ error?: string }>) => Promise<void>; isSaving: boolean }) {
  return <><Panel title="Add inventory item"><form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(() => createInventoryItemAction({ restaurantId, branchId: String(form.get('branchId') || '') || undefined, name: String(form.get('name') || ''), sku: String(form.get('sku') || ''), unit: String(form.get('unit') || 'unit'), reorderLevel: Number(form.get('reorderLevel') || 0), costPerUnit: Number(form.get('costPerUnit') || 0) })) }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px 150px 1fr', gap: '12px' }}><Field label="Ingredient"><input name="name" required style={inputStyle} /></Field><Field label="Unit"><input name="unit" defaultValue="kg" style={inputStyle} /></Field><Field label="Reorder level"><input name="reorderLevel" type="number" min="0" step="0.001" defaultValue="0" style={inputStyle} /></Field><Field label="Cost / unit"><input name="costPerUnit" type="number" min="0" step="0.01" defaultValue="0" style={inputStyle} /></Field><Field label="Branch"><select name="branchId" style={inputStyle}><option value="">All branches</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field></div><div style={{ marginTop: '12px' }}><button style={buttonStyle} disabled={isSaving}>Add item</button></div></form></Panel><Panel title={`Stock ledger · ${inventory.length} items`}><table className="tracking-table"><thead><tr><th>Item</th><th>SKU</th><th>Stock</th><th>Reorder at</th><th>Cost</th><th>Quick receive</th></tr></thead><tbody>{inventory.map(item => <tr key={item.id}><td><strong>{item.name}</strong><br /><small>{item.unit}</small></td><td>{item.sku || '—'}</td><td style={{ color: item.current_stock <= item.reorder_level ? '#FCA5A5' : '#86EFAC' }}>{item.current_stock}</td><td>{item.reorder_level}</td><td>{item.cost_per_unit.toLocaleString('en-IN')}</td><td><button type="button" style={buttonStyle} onClick={() => void run(() => adjustInventoryAction({ restaurantId, inventoryItemId: item.id, movementType: 'purchase', quantity: 1 }))}>+1</button></td></tr>)}</tbody></table></Panel></>
}

function WorkforceTab({ restaurantId, branches, staff, shifts, run, isSaving }: { restaurantId: string; branches: Array<{ id: string; name: string }>; staff: CRMStaff[]; shifts: CRMShift[]; run: (action: () => Promise<{ error?: string }>) => Promise<void>; isSaving: boolean }) {
  return <><Panel title="Schedule a shift"><form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(() => createShiftAction({ restaurantId, branchId: String(form.get('branchId') || ''), staffMemberId: String(form.get('staffMemberId') || ''), startsAt: String(form.get('startsAt') || ''), endsAt: String(form.get('endsAt') || ''), notes: String(form.get('notes') || '') })) }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}><Field label="Staff"><select name="staffMemberId" required style={inputStyle}>{staff.map(member => <option key={member.id} value={member.id}>{member.profiles?.full_name || member.role} · {member.role}</option>)}</select></Field><Field label="Branch"><select name="branchId" required style={inputStyle}>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field><Field label="Starts"><input name="startsAt" type="datetime-local" required style={inputStyle} /></Field><Field label="Ends"><input name="endsAt" type="datetime-local" required style={inputStyle} /></Field></div><div style={{ marginTop: '12px' }}><button style={buttonStyle} disabled={isSaving}>Schedule shift</button></div></form></Panel><Panel title={`Upcoming shifts · ${shifts.length}`}><table className="tracking-table"><thead><tr><th>Staff</th><th>Branch</th><th>Starts</th><th>Ends</th><th>Status</th></tr></thead><tbody>{shifts.map(shift => <tr key={shift.id}><td>{shift.staff_members?.profiles?.full_name || shift.staff_members?.role}</td><td>{shift.branches?.name || '—'}</td><td>{new Date(shift.starts_at).toLocaleString()}</td><td>{new Date(shift.ends_at).toLocaleString()}</td><td>{shift.status}</td></tr>)}</tbody></table></Panel></>
}

function IntegrationsTab({ integrations }: { integrations: CRMIntegration[] }) {
  const providers = ['razorpay', 'stripe', 'whatsapp', 'email', 'delivery_partner', 'accounting']
  return <Panel title="Integrations"><p className="empty-state-desc" style={{ marginBottom: '18px' }}>Provider credentials are intentionally kept outside the browser. Connectors can store a secret reference and expose only safe public configuration here.</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>{providers.map(provider => { const connection = integrations.find(item => item.provider === provider); return <div key={provider} style={{ padding: '16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', background: 'rgba(255,255,255,0.02)' }}><strong style={{ textTransform: 'capitalize' }}>{provider.replace('_', ' ')}</strong><div style={{ marginTop: '7px', fontSize: '0.75rem', color: connection?.status === 'connected' ? '#86EFAC' : '#737373' }}>{connection?.status || 'Not connected'}</div>{connection?.last_error && <div style={{ marginTop: '6px', color: '#FCA5A5', fontSize: '0.7rem' }}>{connection.last_error}</div>}</div> })}</div></Panel>
}
