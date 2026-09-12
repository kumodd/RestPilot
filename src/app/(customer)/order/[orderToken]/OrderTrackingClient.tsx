'use client'

import { useOrderTracking } from '@/lib/hooks/useOrderTracking'
import { formatPrice } from '@/lib/utils/price'
import { ORDER_STATUS_CONFIG } from '@/lib/types/app.types'
import type { OrderStatus } from '@/lib/types/database.types'
import { format } from 'date-fns'

const TIMELINE_STEPS: Array<{
  status: OrderStatus[]
  label: string
  icon: string
  description: string
}> = [
  { status: ['placed', 'awaiting_waiter_verification'], label: 'Order Received', icon: '✓', description: 'Your order has been received' },
  { status: ['waiter_reviewing', 'confirmed'], label: 'Waiter Verified', icon: '🧑‍🍽️', description: 'Waiter has verified your order' },
  { status: ['kitchen_accepted', 'preparing'], label: 'Preparing', icon: '👨‍🍳', description: 'Your food is being prepared' },
  { status: ['ready'], label: 'Ready!', icon: '🔔', description: 'Your order is ready to be served' },
  { status: ['served', 'completed'], label: 'Served', icon: '🍽️', description: 'Enjoy your meal!' },
]

function getStepState(stepStatuses: OrderStatus[], currentStatus: OrderStatus): 'done' | 'active' | 'pending' {
  const statusOrder: OrderStatus[] = [
    'placed', 'awaiting_waiter_verification', 'waiter_reviewing', 'confirmed',
    'kitchen_accepted', 'preparing', 'ready', 'served', 'completed',
  ]

  const currentIdx = statusOrder.indexOf(currentStatus)
  if (currentIdx === -1) return 'pending'

  const stepMaxIdx = Math.max(...stepStatuses.map(s => statusOrder.indexOf(s)))
  const stepMinIdx = Math.min(...stepStatuses.map(s => statusOrder.indexOf(s)))

  if (currentIdx > stepMaxIdx) return 'done'
  if (currentIdx >= stepMinIdx && currentIdx <= stepMaxIdx) return 'active'
  return 'pending'
}

interface Props {
  orderToken: string
}

export default function OrderTrackingClient({ orderToken }: Props) {
  const { order, isLoading, error } = useOrderTracking(orderToken)

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0F0F1A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#FF6B35',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <p style={{ color: '#737373', fontSize: '0.9rem' }}>Loading your order...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0F0F1A',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>😔</div>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F5F5F5', marginBottom: '8px' }}>
          Order Not Found
        </h1>
        <p style={{ color: '#737373', fontSize: '0.875rem', maxWidth: '280px' }}>
          We couldn&apos;t find this order. Please scan the QR code again to start a new order.
        </p>
      </div>
    )
  }

  const statusConfig = ORDER_STATUS_CONFIG[order.status]
  const isTerminal = statusConfig.isTerminal
  const isCancelled = order.status === 'cancelled' || order.status === 'rejected'

  return (
    <div style={{ minHeight: '100vh', background: '#0F0F1A' }}>
      {/* Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1A1A2E 0%, #242438 100%)',
          padding: '40px 20px 32px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '300px',
            height: '150px',
            background: `radial-gradient(ellipse at center, ${statusConfig.color}20, transparent 70%)`,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Live indicator */}
          {!isTerminal && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: '999px',
                padding: '4px 12px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#22C55E',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Live Updates
              </span>
            </div>
          )}

          <div style={{ fontSize: '0.82rem', color: '#737373', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Order #{order.order_number}
          </div>

          <div style={{ fontSize: '0.95rem', color: '#A3A3A3', marginBottom: '20px' }}>
            Table {order.table_number}
          </div>

          {/* Status */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: `${statusConfig.color}18`,
              border: `1.5px solid ${statusConfig.color}40`,
              borderRadius: '999px',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: statusConfig.color,
            }}
          >
            {isCancelled ? '❌' : statusConfig.step >= 5 ? '✓' : '●'} {statusConfig.label}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {!isCancelled && (
        <div style={{ padding: '24px 20px 0' }}>
          <h2 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
            Order Progress
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {TIMELINE_STEPS.map((step, idx) => {
              const state = getStepState(step.status, order.status)
              const isLast = idx === TIMELINE_STEPS.length - 1

              return (
                <div key={idx} style={{ display: 'flex', gap: '16px', paddingBottom: isLast ? 0 : '24px' }}>
                  {/* Indicator */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: state === 'done' ? '0.9rem' : '1.1rem',
                        border: `2px solid ${state === 'done' ? '#22C55E' : state === 'active' ? '#FF6B35' : 'rgba(255,255,255,0.08)'}`,
                        background: state === 'done' ? 'rgba(34,197,94,0.12)' : state === 'active' ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.03)',
                        color: state === 'done' ? '#22C55E' : state === 'active' ? '#FF6B35' : '#525252',
                        boxShadow: state === 'active' ? '0 0 16px rgba(255,107,53,0.3)' : 'none',
                        animation: state === 'active' ? 'pulseGlow 2s ease-in-out infinite' : 'none',
                      }}
                    >
                      {state === 'done' ? '✓' : step.icon}
                    </div>
                    {!isLast && (
                      <div
                        style={{
                          width: '2px',
                          flex: 1,
                          marginTop: '6px',
                          background: state === 'done' ? '#22C55E' : 'rgba(255,255,255,0.06)',
                          minHeight: '24px',
                          transition: 'background 0.5s ease',
                        }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingTop: '10px' }}>
                    <p
                      style={{
                        fontWeight: state === 'pending' ? 400 : 600,
                        color: state === 'pending' ? '#525252' : '#F5F5F5',
                        fontSize: '0.95rem',
                      }}
                    >
                      {step.label}
                    </p>
                    {state !== 'pending' && (
                      <p style={{ fontSize: '0.8rem', color: '#737373', marginTop: '2px' }}>
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Order Items */}
      <div style={{ padding: '24px 20px' }}>
        <h2 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
          Order Items
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {order.items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div>
                <span style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.9rem' }}>
                  {item.quantity}× {item.name}
                </span>
                {item.special_instructions && (
                  <p style={{ fontSize: '0.75rem', color: '#737373', marginTop: '2px' }}>
                    📝 {item.special_instructions}
                  </p>
                )}
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: item.status === 'ready' ? 'rgba(34,197,94,0.12)' : item.status === 'preparing' ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.06)',
                  color: item.status === 'ready' ? '#22C55E' : item.status === 'preparing' ? '#FF6B35' : '#737373',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  flexShrink: 0,
                  marginLeft: '8px',
                }}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Price Summary */}
      <div style={{ padding: '0 20px 20px' }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            padding: '16px',
          }}
        >
          {order.tax > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#737373', marginBottom: '8px' }}>
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal, order.currency_symbol)}</span>
            </div>
          )}
          {order.tax > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#737373', marginBottom: '8px' }}>
              <span>Tax</span>
              <span>{formatPrice(order.tax, order.currency_symbol)}</span>
            </div>
          )}
          {order.service_charge > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#737373', marginBottom: '8px' }}>
              <span>Service Charge</span>
              <span>{formatPrice(order.service_charge, order.currency_symbol)}</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '1.05rem',
              color: '#F5F5F5',
              paddingTop: order.tax > 0 ? '12px' : 0,
              borderTop: order.tax > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}
          >
            <span>Total</span>
            <span style={{ color: '#FF6B35' }}>{formatPrice(order.total, order.currency_symbol)}</span>
          </div>
        </div>
      </div>

      {/* Event Log */}
      {order.events.length > 0 && (
        <div style={{ padding: '0 20px 40px' }}>
          <h2 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            Activity
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...order.events].reverse().map((event, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: idx < order.events.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#525252', flexShrink: 0, minWidth: '70px' }}>
                  {format(new Date(event.created_at), 'h:mm a')}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#A3A3A3', textTransform: 'capitalize' }}>
                  {event.event_type.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(255,107,53,0.3); }
          50% { box-shadow: 0 0 20px rgba(255,107,53,0.6); }
        }
      `}</style>
    </div>
  )
}
