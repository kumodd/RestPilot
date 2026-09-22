'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils/price'
import { createClient } from '@/lib/supabase/client'
import { useCustomerStorage } from '@/lib/hooks/useCustomerStorage'
import type { CartItem, QRResolution, RestaurantSettings, CustomerBrowserData } from '@/lib/types/app.types'

interface Props {
  cart: {
    items: CartItem[]
    totalItems: number
    subtotal: number
    updateQuantity: (cartItemId: string, delta: number) => void
    removeItem: (cartItemId: string) => void
    clearCart: () => void
  }
  restaurant: QRResolution['restaurant']
  table: QRResolution['table']
  settings: RestaurantSettings | null
  customerData: CustomerBrowserData | null
  tableToken: string
  existingOrderToken?: string | null
  onClose: () => void
}

export default function CartSheet({
  cart,
  restaurant,
  table,
  settings,
  customerData: initialCustomerData,
  tableToken,
  existingOrderToken = null,
  onClose,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { save: saveCustomer } = useCustomerStorage(restaurant.id)

  const [name, setName] = useState(initialCustomerData?.name ?? '')
  const [phone, setPhone] = useState(initialCustomerData?.phone ?? '')
  const [notes, setNotes] = useState('')
  const [isPlacing, setIsPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Persist the idempotency key across re-renders of the CartSheet
  const [clientRequestId] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`)

  const primaryColor = restaurant.primary_color ?? '#FF6B35'

  // Calculate totals (display only — server recalculates)
  const taxRate = settings?.tax_enabled ? (settings.tax_percentage / 100) : 0
  const scRate = settings?.service_charge_enabled ? (settings.service_charge_percentage / 100) : 0
  const displayTax = Math.round(cart.subtotal * taxRate * 100) / 100
  const displaySC = Math.round(cart.subtotal * scRate * 100) / 100
  const displayTotal = cart.subtotal + displayTax + displaySC

  const handlePlaceOrder = async () => {
    if (!existingOrderToken && settings?.customer_phone_required && !phone.trim()) {
      setError('Phone number is required')
      return
    }

    setIsPlacing(true)
    setError(null)

    // Save customer details to browser storage
    if (name || phone) {
      saveCustomer({ name: name.trim(), phone: phone.trim() })
    }

    const itemsPayload = cart.items.map(item => ({
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      special_instructions: item.specialInstructions || null,
      variant_selections: item.selectedVariants.map(v => ({
        variant_name: v.variantName,
        option_name: v.optionName,
        price_delta: v.priceDelta,
      })),
      addon_ids: item.selectedAddons.map(a => a.addonId),
    }))

    try {
      const rpcName = existingOrderToken ? 'add_items_to_order' : 'place_order_from_qr'
      const rpcArgs = existingOrderToken
        ? { p_order_token: existingOrderToken, p_items: itemsPayload }
        : {
            p_qr_token: tableToken,
            p_table_session_id: null,
            p_customer_name: name.trim() || null,
            p_customer_phone: phone.trim() || null,
            p_customer_notes: notes.trim() || null,
            p_client_request_id: clientRequestId,
            p_items: itemsPayload,
          }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase.rpc as any)(rpcName, rpcArgs)

      const orderResult = data as { error?: string; order_token?: string } | null
      if (rpcError || !orderResult || orderResult.error) {
        setError(rpcError?.message ?? orderResult?.error ?? 'Failed to place order. Please try again.')
        setIsPlacing(false)
        return
      }

      cart.clearCart()
      try {
        localStorage.setItem('restpilot_last_table_token', tableToken)
      } catch {}
      router.push(`/order/${existingOrderToken ?? orderResult?.order_token}`)
    } catch {
      setError('Something went wrong. Please check your connection and try again.')
      setIsPlacing(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#1A1A2E',
          borderRadius: '24px 24px 0 0',
          zIndex: 1001,
          maxHeight: '96vh',
          overflowY: 'auto',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          animation: 'slideUp 0.3s ease',
        }}
      >
        {/* Handle */}
        <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '999px', margin: '12px auto' }} />

        <div style={{ padding: '0 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F5F5F5' }}>{existingOrderToken ? 'Add to live order' : 'Your Order'}</h2>
              <p style={{ fontSize: '0.8rem', color: '#737373' }}>
                {existingOrderToken ? 'These items will be sent to the kitchen' : `${table.display_name ?? `Table ${table.table_number}`} · ${restaurant.name}`}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#A3A3A3',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
              }}
            >
              ×
            </button>
          </div>

          {/* Cart Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {cart.items.map(item => (
              <div
                key={item.cartItemId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#F5F5F5' }}>{item.name}</p>
                  {item.selectedVariants.length > 0 && (
                    <p style={{ fontSize: '0.75rem', color: '#737373' }}>
                      {item.selectedVariants.map(v => v.optionName).join(', ')}
                    </p>
                  )}
                  {item.selectedAddons.length > 0 && (
                    <p style={{ fontSize: '0.75rem', color: '#737373' }}>
                      + {item.selectedAddons.map(a => a.name).join(', ')}
                    </p>
                  )}
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: primaryColor, marginTop: '4px' }}>
                    {formatPrice(item.lineTotal, restaurant.currency_symbol)}
                  </p>
                </div>

                {/* Qty Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => {
                      if (item.quantity === 1) {
                        cart.removeItem(item.cartItemId)
                      } else {
                        cart.updateQuantity(item.cartItemId, -1)
                      }
                    }}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.08)',
                      border: 'none',
                      color: item.quantity === 1 ? '#EF4444' : '#A3A3A3',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.quantity === 1 ? '🗑' : '−'}
                  </button>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#F5F5F5', minWidth: '16px', textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => cart.updateQuantity(item.cartItemId, 1)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: `${primaryColor}20`,
                      border: 'none',
                      color: primaryColor,
                      cursor: 'pointer',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Customer Info */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
              Your Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                placeholder={`Your name${!settings?.customer_name_required ? ' (optional)' : ''}`}
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#F5F5F5',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <input
                type="tel"
                placeholder={`Phone number${settings?.customer_phone_required ? ' (required)' : ' (optional)'}`}
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${error && settings?.customer_phone_required && !phone ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '10px',
                  color: '#F5F5F5',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <textarea
                placeholder="Any special instructions for the order?"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={300}
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#F5F5F5',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'none',
                  minHeight: '60px',
                  outline: 'none',
                }}
              />
            </div>

            {initialCustomerData && (
              <p style={{ fontSize: '0.72rem', color: '#525252', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ✓ Details auto-filled from your last visit
              </p>
            )}
          </div>

          {/* Price Summary */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#A3A3A3' }}>
                <span>Subtotal ({cart.totalItems} items)</span>
                <span>{formatPrice(cart.subtotal, restaurant.currency_symbol)}</span>
              </div>
              {displayTax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#A3A3A3' }}>
                  <span>{settings?.tax_label ?? 'Tax'} ({settings?.tax_percentage}%)</span>
                  <span>{formatPrice(displayTax, restaurant.currency_symbol)}</span>
                </div>
              )}
              {displaySC > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#A3A3A3' }}>
                  <span>{settings?.service_charge_label ?? 'Service Charge'} ({settings?.service_charge_percentage}%)</span>
                  <span>{formatPrice(displaySC, restaurant.currency_symbol)}</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: '#F5F5F5',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  marginTop: '4px',
                }}
              >
                <span>Total</span>
                <span style={{ color: primaryColor }}>{formatPrice(displayTotal, restaurant.currency_symbol)}</span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '0.85rem',
                color: '#FCA5A5',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Place Order Button */}
          <button
            onClick={handlePlaceOrder}
            disabled={isPlacing || cart.items.length === 0}
            style={{
              width: '100%',
              padding: '16px',
              background: isPlacing ? 'rgba(255,255,255,0.1)' : primaryColor,
              color: 'white',
              border: 'none',
              borderRadius: '14px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: isPlacing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: isPlacing ? 'none' : `0 8px 24px ${primaryColor}50`,
              transition: 'all 0.25s ease',
            }}
          >
            {isPlacing ? (
              <>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
                Placing Order...
              </>
            ) : (
              <>
                {existingOrderToken ? '➕ Add to Order' : '🚀 Place Order'} · {formatPrice(displayTotal, restaurant.currency_symbol)}
              </>
            )}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#525252', marginTop: '12px' }}>
            {existingOrderToken ? 'Your staff will be notified about the update.' : 'A waiter will visit your table to confirm the order'}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
