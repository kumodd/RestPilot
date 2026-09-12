'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useCustomerStorage } from '@/lib/hooks/useCustomerStorage'
import type { QRResolution } from '@/lib/types/app.types'

interface Props {
  resolution: QRResolution
  tableToken: string
}

export default function QRLandingClient({ resolution, tableToken }: Props) {
  const { restaurant, branch, table } = resolution
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClient()
  const { customerData } = useCustomerStorage(restaurant.id)
  const [activeOrders, setActiveOrders] = useState<any[]>([])
  const [isCheckingOrders, setIsCheckingOrders] = useState(false)
  const [manualPhone, setManualPhone] = useState('')
  const [showManualCheck, setShowManualCheck] = useState(false)

  useEffect(() => {
    if (customerData?.phone) {
      checkOrders(customerData.phone)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerData?.phone])

  const checkOrders = async (phoneToUse: string) => {
    if (!phoneToUse.trim()) return
    setIsCheckingOrders(true)
    try {
      const { data, error } = await (supabase.rpc as any)('get_active_orders_by_phone', {
        p_restaurant_id: restaurant.id,
        p_phone: phoneToUse.trim(),
      })
      if (!error && data) {
        setActiveOrders(data as any[])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsCheckingOrders(false)
    }
  }

  // Apply restaurant branding via CSS variables
  const brandStyle = {
    '--restaurant-primary': restaurant.primary_color ?? '#FF6B35',
    '--restaurant-secondary': restaurant.secondary_color ?? '#1A1A2E',
  } as React.CSSProperties

  return (
    <div
      className="theme-customer"
      style={{
        ...brandStyle,
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${restaurant.secondary_color ?? '#1A1A2E'} 0%, #0F0F1A 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      {/* Glow effect */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: `radial-gradient(ellipse at center top, ${restaurant.primary_color ?? '#FF6B35'}20 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '360px', width: '100%' }}>
        {/* Logo */}
        {restaurant.logo_url ? (
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              overflow: 'hidden',
              margin: '0 auto 24px',
              border: '2px solid rgba(255,255,255,0.15)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <Image
              src={restaurant.logo_url}
              alt={restaurant.name}
              width={80}
              height={80}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: `linear-gradient(135deg, ${restaurant.primary_color ?? '#FF6B35'}, ${restaurant.secondary_color ?? '#1A1A2E'})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.2rem',
              margin: '0 auto 24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            🍽️
          </div>
        )}

        {/* Restaurant info */}
        <h1
          style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            color: '#F5F5F5',
            marginBottom: '6px',
            letterSpacing: '-0.02em',
          }}
        >
          {restaurant.name}
        </h1>

        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.55)', marginBottom: '32px' }}>
          {branch.name}
          {branch.city ? ` · ${branch.city}` : ''}
        </p>

        {/* Table badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '999px',
            padding: '10px 20px',
            marginBottom: '48px',
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>🪑</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F5F5F5' }}>
            {table.display_name ?? `Table ${table.table_number}`}
          </span>
          {table.section && (
            <span
              style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.06)',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {table.section}
            </span>
          )}
        </div>

        {/* Primary CTA */}
        {restaurant.is_accepting_orders ? (
          <Link
            href={`/t/${tableToken}/menu`}
            onClick={() => setIsLoading(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              padding: '18px 28px',
              background: `linear-gradient(135deg, ${restaurant.primary_color ?? '#FF6B35'}, ${restaurant.primary_color ?? '#FF6B35'}CC)`,
              color: 'white',
              borderRadius: '16px',
              fontSize: '1.1rem',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: `0 8px 32px ${restaurant.primary_color ?? '#FF6B35'}50`,
              letterSpacing: '-0.01em',
            }}
          >
            {isLoading ? (
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
            ) : (
              <>
                <span style={{ fontSize: '1.3rem' }}>🍽️</span>
                View Menu
              </>
            )}
          </Link>
        ) : (
          <div
            style={{
              padding: '20px',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '16px',
              color: '#FCA5A5',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>😔</div>
            <p style={{ fontWeight: 600, marginBottom: '4px' }}>Not accepting orders</p>
            <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
              We&apos;re currently not taking new orders. Please ask our staff for assistance.
            </p>
          </div>
        )}

        {/* Order Recovery */}
        {activeOrders.length > 0 ? (
          <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '0.85rem', color: '#A3A3A3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Your Active Orders
            </p>
            {activeOrders.map(order => (
              <Link
                key={order.order_token}
                href={`/order/${order.order_token}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  color: 'white',
                  textDecoration: 'none',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>
                    Order #{order.order_number}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#A3A3A3' }}>
                    Status: <span style={{ color: '#22C55E', textTransform: 'capitalize' }}>{order.status.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                <div style={{ fontSize: '1.2rem' }}>→</div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: '32px' }}>
            {!showManualCheck ? (
              <button
                onClick={() => setShowManualCheck(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.85rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Track a previous order
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '0.8rem', color: '#A3A3A3', textAlign: 'left', margin: 0 }}>Enter your phone number to find active orders.</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={manualPhone}
                    onChange={e => setManualPhone(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#F5F5F5', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <button
                    onClick={() => checkOrders(manualPhone)}
                    disabled={isCheckingOrders || !manualPhone.trim()}
                    style={{ padding: '0 16px', background: restaurant.primary_color ?? '#FF6B35', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: isCheckingOrders ? 'not-allowed' : 'pointer', opacity: isCheckingOrders || !manualPhone.trim() ? 0.7 : 1 }}
                  >
                    Check
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p
          style={{
            marginTop: '32px',
            fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: '0.04em',
          }}
        >
          POWERED BY RESTPILOT
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
