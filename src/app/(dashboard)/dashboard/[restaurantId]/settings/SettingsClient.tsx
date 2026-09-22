'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RestaurantRow {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  currency: string
  currency_symbol: string
  phone: string | null
  email: string | null
  website_url: string | null
}

interface SettingsRow {
  id: string
  restaurant_id: string
  waiter_verification_required: boolean
  customer_can_add_items: boolean
  customer_can_remove_confirmed_items: boolean
  waiter_recommendations_enabled: boolean
  customer_name_required: boolean
  customer_phone_required: boolean
  tax_enabled: boolean
  tax_percentage: number
  tax_label: string | null
  service_charge_enabled: boolean
  service_charge_percentage: number
  service_charge_label: string | null
  auto_accept_kitchen_orders: boolean
  max_items_per_order: number | null
  waiter_sound_notifications: boolean
  kitchen_sound_notifications: boolean
}

interface Props {
  restaurant: RestaurantRow | null
  settings: SettingsRow | null
  restaurantId: string
}

type Tab = 'general' | 'workflow' | 'charges' | 'notifications'

function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className="settings-toggle-row"
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#F5F5F5', marginBottom: description ? '3px' : 0 }}>{label}</p>
        {description && <p style={{ fontSize: '0.78rem', color: '#737373' }}>{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative', width: '44px', height: '24px',
          background: checked ? '#FF6B35' : 'rgba(255,255,255,0.1)',
          borderRadius: '999px', border: 'none', cursor: 'pointer',
          transition: 'background 0.25s ease', flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute', top: '2px',
            left: checked ? '22px' : '2px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            transition: 'left 0.25s ease',
          }}
        />
      </button>
    </div>
  )
}

export default function SettingsClient({ restaurant, settings, restaurantId }: Props) {
  const supabase = createClient()

  // General fields
  const [name, setName] = useState(restaurant?.name ?? '')
  const [description, setDescription] = useState(restaurant?.description ?? '')
  const [phone, setPhone] = useState(restaurant?.phone ?? '')
  const [email, setEmail] = useState(restaurant?.email ?? '')
  const [website, setWebsite] = useState(restaurant?.website_url ?? '')
  const [currencySymbol, setCurrencySymbol] = useState(restaurant?.currency_symbol ?? '₹')
  const [currencyCode, setCurrencyCode] = useState(restaurant?.currency ?? 'INR')

  // Workflow settings
  const [waiterVerify, setWaiterVerify] = useState(settings?.waiter_verification_required ?? true)
  const [customerAddItems, setCustomerAddItems] = useState(settings?.customer_can_add_items ?? true)
  const [customerRemoveItems, setCustomerRemoveItems] = useState(settings?.customer_can_remove_confirmed_items ?? false)
  const [waiterRecs, setWaiterRecs] = useState(settings?.waiter_recommendations_enabled ?? true)
  const [nameRequired, setNameRequired] = useState(settings?.customer_name_required ?? false)
  const [phoneRequired, setPhoneRequired] = useState(settings?.customer_phone_required ?? true)
  const [autoKitchen, setAutoKitchen] = useState(settings?.auto_accept_kitchen_orders ?? false)
  const [maxItems, setMaxItems] = useState(String(settings?.max_items_per_order ?? 50))

  // Tax & charges
  const [taxEnabled, setTaxEnabled] = useState(settings?.tax_enabled ?? false)
  const [taxPercent, setTaxPercent] = useState(String(settings?.tax_percentage ?? 0))
  const [taxLabel, setTaxLabel] = useState(settings?.tax_label ?? 'GST')
  const [serviceEnabled, setServiceEnabled] = useState(settings?.service_charge_enabled ?? false)
  const [servicePercent, setServicePercent] = useState(String(settings?.service_charge_percentage ?? 0))
  const [serviceLabel, setServiceLabel] = useState(settings?.service_charge_label ?? 'Service Charge')

  // Notifications
  const [waiterSound, setWaiterSound] = useState(settings?.waiter_sound_notifications ?? true)
  const [kitchenSound, setKitchenSound] = useState(settings?.kitchen_sound_notifications ?? true)

  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const saveAll = async () => {
    setIsSaving(true)
    setSaveMsg(null)

    // Update restaurant using the actual database column names.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: restaurantError } = await (supabase.from('restaurants') as any).update({
      name: name.trim(),
      description: description.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      website_url: website.trim() || null,
      currency_symbol: currencySymbol,
      currency: currencyCode,
    }).eq('id', restaurantId)

    if (restaurantError) {
      setSaveMsg(`Unable to save restaurant details: ${restaurantError.message}`)
      setIsSaving(false)
      return
    }

    const settingsPayload = {
      restaurant_id: restaurantId,
      waiter_verification_required: waiterVerify,
      customer_can_add_items: customerAddItems,
      customer_can_remove_confirmed_items: customerRemoveItems,
      waiter_recommendations_enabled: waiterRecs,
      customer_name_required: nameRequired,
      customer_phone_required: phoneRequired,
      tax_enabled: taxEnabled,
      tax_percentage: parseFloat(taxPercent) || 0,
      tax_label: taxLabel,
      service_charge_enabled: serviceEnabled,
      service_charge_percentage: parseFloat(servicePercent) || 0,
      service_charge_label: serviceLabel,
      auto_accept_kitchen_orders: autoKitchen,
      max_items_per_order: parseInt(maxItems, 10) || 50,
      waiter_sound_notifications: waiterSound,
      kitchen_sound_notifications: kitchenSound,
    }

    if (settings?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('restaurant_settings') as any).update(settingsPayload).eq('id', settings.id)
      if (error) {
        setSaveMsg(`Unable to save workflow settings: ${error.message}`)
        setIsSaving(false)
        return
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('restaurant_settings') as any).insert(settingsPayload)
      if (error) {
        setSaveMsg(`Unable to create workflow settings: ${error.message}`)
        setIsSaving(false)
        return
      }
    }

    setSaveMsg('Settings saved successfully!')
    setIsSaving(false)
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const TABS: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'general', label: 'General', icon: '🏪' },
    { id: 'workflow', label: 'Order Workflow', icon: '⚙️' },
    { id: 'charges', label: 'Tax & Charges', icon: '💰' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
  ]

  return (
    <main className="page-content" style={{ maxWidth: '720px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Restaurant Settings</h1>
          <p className="page-subtitle">{restaurant?.name ?? 'Configure your restaurant'}</p>
        </div>
        <button className="btn btn-primary" onClick={saveAll} disabled={isSaving}>
          {isSaving ? 'Saving...' : '💾 Save All'}
        </button>
      </div>

      {/* Save feedback */}
      {saveMsg && (
        <div
          style={{
            marginBottom: '20px', padding: '12px 16px',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: '10px', color: '#86EFAC', fontSize: '0.88rem', fontWeight: 600,
          }}
        >
          ✅ {saveMsg}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex', gap: '4px', marginBottom: '28px',
          background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '4px',
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '9px 6px', borderRadius: '8px', border: 'none',
              background: activeTab === tab.id ? '#FF6B35' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#737373',
              fontSize: '0.8rem', fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '5px',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '24px',
        }}
      >
        {/* GENERAL */}
        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Restaurant Name *</label>
              <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell customers about your restaurant..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input type="tel" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="info@restaurant.com" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input type="url" className="form-input" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://restaurant.com" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Currency Symbol</label>
                <input type="text" className="form-input" value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)} placeholder="₹" style={{ maxWidth: '80px' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Currency Code</label>
                <input type="text" className="form-input" value={currencyCode} onChange={e => setCurrencyCode(e.target.value)} placeholder="INR" style={{ maxWidth: '100px' }} />
              </div>
            </div>
          </div>
        )}

        {/* WORKFLOW */}
        {activeTab === 'workflow' && (
          <div>
            <p style={{ fontSize: '0.82rem', color: '#737373', marginBottom: '16px' }}>
              Control how orders are processed from customer placement to kitchen.
            </p>
            <ToggleRow
              label="Waiter Verification Required"
              description="Orders must be reviewed by a waiter before going to the kitchen."
              checked={waiterVerify} onChange={setWaiterVerify}
            />
            <ToggleRow
              label="Customers Can Add Items After Ordering"
              description="Allow customers to add more items to an in-progress order."
              checked={customerAddItems} onChange={setCustomerAddItems}
            />
            <ToggleRow
              label="Customers Can Remove Confirmed Items"
              description="Allow customers to remove items after waiter confirmation."
              checked={customerRemoveItems} onChange={setCustomerRemoveItems}
            />
            <ToggleRow
              label="Waiter Recommendations Enabled"
              description="Waiters can suggest and add approved items to customer orders."
              checked={waiterRecs} onChange={setWaiterRecs}
            />
            <ToggleRow
              label="Customer Name Required"
              description="Force customers to provide their name before placing an order."
              checked={nameRequired} onChange={setNameRequired}
            />
            <ToggleRow
              label="Customer Phone Required"
              description="Force customers to provide a phone number before ordering."
              checked={phoneRequired} onChange={setPhoneRequired}
            />
            <ToggleRow
              label="Auto-Accept Kitchen Orders"
              description="Orders go straight to kitchen without waiter confirmation step."
              checked={autoKitchen} onChange={setAutoKitchen}
            />
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Max Items Per Order</label>
              <input
                type="number" className="form-input" value={maxItems}
                onChange={e => setMaxItems(e.target.value)} min={1} max={200}
                style={{ maxWidth: '100px' }}
              />
            </div>
          </div>
        )}

        {/* CHARGES */}
        {activeTab === 'charges' && (
          <div>
            <p style={{ fontSize: '0.82rem', color: '#737373', marginBottom: '20px' }}>
              Taxes and service charges are calculated server-side and cannot be bypassed.
            </p>

            {/* Tax */}
            <div
              style={{
                padding: '16px', borderRadius: '12px', marginBottom: '16px',
                background: taxEnabled ? 'rgba(255,107,53,0.05)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${taxEnabled ? 'rgba(255,107,53,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <ToggleRow label="Enable Tax" description="Add a tax line to every order." checked={taxEnabled} onChange={setTaxEnabled} />
              {taxEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Tax Rate (%)</label>
                    <input type="number" className="form-input" value={taxPercent} onChange={e => setTaxPercent(e.target.value)} min={0} max={50} step={0.1} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tax Label</label>
                    <input type="text" className="form-input" value={taxLabel} onChange={e => setTaxLabel(e.target.value)} placeholder="GST" />
                  </div>
                </div>
              )}
            </div>

            {/* Service Charge */}
            <div
              style={{
                padding: '16px', borderRadius: '12px',
                background: serviceEnabled ? 'rgba(255,107,53,0.05)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${serviceEnabled ? 'rgba(255,107,53,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <ToggleRow label="Enable Service Charge" description="Add a service charge to every order." checked={serviceEnabled} onChange={setServiceEnabled} />
              {serviceEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Service Charge (%)</label>
                    <input type="number" className="form-input" value={servicePercent} onChange={e => setServicePercent(e.target.value)} min={0} max={30} step={0.1} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Label</label>
                    <input type="text" className="form-input" value={serviceLabel} onChange={e => setServiceLabel(e.target.value)} placeholder="Service Charge" />
                  </div>
                </div>
              )}
            </div>

            {(taxEnabled || serviceEnabled) && (
              <div
                style={{
                  marginTop: '16px', padding: '12px 16px',
                  background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
                  borderRadius: '10px', fontSize: '0.8rem', color: '#93C5FD',
                }}
              >
                💡 Example: ₹200 order → Tax {taxEnabled ? `${taxPercent}% = ₹${(200 * parseFloat(taxPercent || '0') / 100).toFixed(2)}` : '₹0'} · Service {serviceEnabled ? `${servicePercent}% = ₹${(200 * parseFloat(servicePercent || '0') / 100).toFixed(2)}` : '₹0'} → Total ₹{(200 * (1 + (taxEnabled ? parseFloat(taxPercent || '0') : 0) / 100 + (serviceEnabled ? parseFloat(servicePercent || '0') : 0) / 100)).toFixed(2)}
              </div>
            )}
          </div>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="notification-settings-panel">
            <div className="notification-settings-intro">
              <div className="notification-settings-intro-icon">🔔</div>
              <div>
                <h3>Keep the team in sync</h3>
                <p>Sound alerts help front-of-house and kitchen teams react quickly while the notification center keeps a written activity trail.</p>
              </div>
            </div>
            <div className="notification-settings-list">
              <ToggleRow
                label="Waiter sound alerts"
                description="Play a sound when a new order or customer service request needs waiter attention."
                checked={waiterSound} onChange={setWaiterSound}
              />
              <ToggleRow
                label="Kitchen sound alerts"
                description="Play a sound when a confirmed order arrives at the kitchen screen."
                checked={kitchenSound} onChange={setKitchenSound}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom save bar */}
      <div
        style={{
          display: 'flex', justifyContent: 'flex-end', gap: '10px',
          marginTop: '20px', paddingTop: '20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button className="btn btn-primary" onClick={saveAll} disabled={isSaving} style={{ minWidth: '140px' }}>
          {isSaving ? 'Saving...' : '💾 Save Settings'}
        </button>
      </div>
    </main>
  )
}
