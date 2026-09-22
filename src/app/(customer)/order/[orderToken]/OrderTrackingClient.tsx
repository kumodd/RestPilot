'use client'

import Link from 'next/link'
import { useOrderTracking } from '@/lib/hooks/useOrderTracking'
import { formatPrice } from '@/lib/utils/price'
import { createClient } from '@/lib/supabase/client'
import { ORDER_STATUS_CONFIG } from '@/lib/types/app.types'
import type { OrderStatus } from '@/lib/types/database.types'
import { format } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import CustomerBottomNav from '@/components/customer/CustomerBottomNav'

type ServiceRequestType = 'waiter' | 'water' | 'cutlery' | 'cleaning'

const SERVICE_REQUESTS: Array<{ type: ServiceRequestType; label: string; icon: string }> = [
  { type: 'waiter', label: 'Call waiter', icon: '🙋' },
  { type: 'water', label: 'Water', icon: '💧' },
  { type: 'cutlery', label: 'Cutlery', icon: '🍴' },
  { type: 'cleaning', label: 'Clean table', icon: '✨' },
]

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
  const { order, isLoading, error, refetch } = useOrderTracking(orderToken)
  const supabase = useMemo(() => createClient(), [])
  const [billRequested, setBillRequested] = useState(false)
  const [billError, setBillError] = useState<string | null>(null)
  const [feedbackRating, setFeedbackRating] = useState(0)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [serviceRequestPending, setServiceRequestPending] = useState<ServiceRequestType | null>(null)
  const [serviceRequested, setServiceRequested] = useState<ServiceRequestType | null>(null)
  const [serviceError, setServiceError] = useState<string | null>(null)
  const [tableToken, setTableToken] = useState<string | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [isEditingOrder, setIsEditingOrder] = useState(false)
  const [draftQuantities, setDraftQuantities] = useState<Record<string, number>>({})
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const previousStatusRef = useRef<OrderStatus | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const timer = window.setTimeout(() => {
      try {
        setTableToken(window.localStorage.getItem('restpilot_last_table_token'))
      } catch {}

      if ('Notification' in window) {
        setNotificationsEnabled(window.Notification.permission === 'granted')
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!order) return

    const previousStatus = previousStatusRef.current
    if (
      previousStatus &&
      previousStatus !== order.status &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted'
    ) {
      new window.Notification('Order update', {
        body: ORDER_STATUS_CONFIG[order.status].description,
        tag: `restpilot-order-${orderToken}`,
      })
    }
    previousStatusRef.current = order.status
  }, [order, orderToken])

  const requestBill = async () => {
    setBillError(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: rpcError } = await (supabase.rpc as any)('request_bill_from_order_token', { p_order_token: orderToken })
    if (rpcError || data?.error) {
      setBillError(rpcError?.message ?? data?.error ?? 'Unable to request the bill')
      return
    }
    setBillRequested(true)
  }

  const requestService = async (requestType: ServiceRequestType) => {
    setServiceError(null)
    setServiceRequestPending(requestType)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: rpcError } = await (supabase.rpc as any)('create_customer_service_request', {
      p_order_token: orderToken,
      p_request_type: requestType,
      p_message: null,
    })

    if (rpcError || data?.error) {
      setServiceError(rpcError?.message ?? data?.error ?? 'Unable to send your request')
    } else {
      setServiceRequested(requestType)
    }
    setServiceRequestPending(null)
  }

  const enableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    const permission = await window.Notification.requestPermission()
    setNotificationsEnabled(permission === 'granted')
  }

  const beginEditingOrder = () => {
    if (!order) return
    setDraftQuantities(Object.fromEntries(order.items.map(item => [item.id, item.quantity])))
    setEditError(null)
    setIsEditingOrder(true)
  }

  const saveOrderEdits = async () => {
    if (!order) return
    setIsSavingEdit(true)
    setEditError(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: rpcError } = await (supabase.rpc as any)('update_customer_order', {
      p_order_token: orderToken,
      p_items: order.items.map(item => ({
        order_item_id: item.id,
        quantity: draftQuantities[item.id] ?? item.quantity,
        special_instructions: item.special_instructions,
      })),
    })

    if (rpcError || data?.error) {
      setEditError(rpcError?.message ?? data?.error ?? 'Unable to update your order')
    } else {
      setIsEditingOrder(false)
      await refetch()
    }
    setIsSavingEdit(false)
  }

  const submitFeedback = async () => {
    if (!feedbackRating) return
    setFeedbackError(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: rpcError } = await (supabase.rpc as any)('submit_customer_feedback', {
      p_order_token: orderToken,
      p_rating: feedbackRating,
      p_comment: feedbackComment.trim() || null,
      p_category: null,
    })
    if (rpcError || data?.error) {
      setFeedbackError(rpcError?.message ?? data?.error ?? 'Unable to submit feedback')
      return
    }
    setFeedbackSubmitted(true)
  }

  if (isLoading) {
    return (
      <div className="customer-state-page">
        <div className="customer-state-card">
          <div className="customer-spinner" />
          <p>Loading your order…</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="customer-state-page">
        <div className="customer-state-card">
          <div className="customer-state-icon">😔</div>
          <h2>Order not found</h2>
          <p>We couldn&apos;t find this order. Please scan the QR code again to start a new order.</p>
        </div>
      </div>
    )
  }

  const statusConfig = ORDER_STATUS_CONFIG[order.status]
  const isTerminal = statusConfig.isTerminal
  const isCancelled = order.status === 'cancelled' || order.status === 'rejected'

  return (
    <div className="customer-tracking-page" style={{ minHeight: '100vh', background: '#F7F7F8', paddingBottom: tableToken ? '104px' : 0 }}>
      {/* Hero */}
      <div
        className="customer-tracking-hero"
        style={{
          background: '#FFFFFF',
          padding: tableToken ? '58px 20px 32px' : '40px 20px 32px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(23,23,23,0.07)',
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
          {tableToken && (
            <Link
              href={`/t/${tableToken}/menu?order=${encodeURIComponent(orderToken)}`}
              className="customer-tracking-back"
            >
              <ArrowLeft size={15} strokeWidth={2.4} />
              Menu
            </Link>
          )}

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

          <div style={{ fontSize: '0.95rem', color: '#737373', marginBottom: '20px' }}>
            Table {order.table_number}
          </div>

          {order.placed_at && (
            <div style={{ fontSize: '0.75rem', color: '#737373', marginBottom: '16px' }}>
              Placed {format(new Date(order.placed_at), 'h:mm a')}
            </div>
          )}

          {!isTerminal && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" onClick={beginEditingOrder} style={{ padding: '9px 16px', borderRadius: '999px', border: '1px solid rgba(23,23,23,0.1)', background: '#F4F4F5', color: '#262626', cursor: 'pointer', fontWeight: 700 }}>
                Edit order
              </button>
              <button type="button" onClick={() => void requestBill()} disabled={billRequested} style={{ padding: '9px 16px', borderRadius: '999px', border: '1px solid rgba(23,23,23,0.1)', background: billRequested ? 'rgba(34,197,94,0.12)' : '#F4F4F5', color: billRequested ? '#15803D' : '#262626', cursor: billRequested ? 'default' : 'pointer', fontWeight: 700 }}>
                {billRequested ? '✓ Bill requested' : 'Request bill'}
              </button>
              {!notificationsEnabled && typeof window !== 'undefined' && 'Notification' in window && (
                <button type="button" onClick={() => void enableNotifications()} style={{ padding: '9px 16px', borderRadius: '999px', border: '1px solid rgba(23,23,23,0.1)', background: '#F4F4F5', color: '#262626', cursor: 'pointer', fontWeight: 700 }}>
                  🔔 Live alerts
                </button>
              )}
              {billError && <p style={{ color: '#B91C1C', fontSize: '0.75rem', marginTop: '7px' }}>{billError}</p>}
            </div>
          )}

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

          {tableToken && (
            <Link
              href={`/t/${tableToken}/menu?order=${encodeURIComponent(orderToken)}`}
              style={{ display: 'block', color: '#737373', fontSize: '0.8rem', marginTop: '14px', textDecoration: 'underline' }}
            >
              Add more items
            </Link>
          )}
        </div>
      </div>

      {!isCancelled && !isTerminal && (
        <section style={{ padding: '20px 20px 0' }}>
          <div className="customer-tracking-card" style={{ padding: '16px', background: '#FFFFFF', border: '1px solid rgba(23,23,23,0.06)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#171717' }}>Need anything?</h2>
                <p style={{ fontSize: '0.76rem', color: '#737373', marginTop: '3px' }}>A staff member will be notified.</p>
              </div>
              {serviceRequested && <span style={{ color: '#15803D', fontSize: '0.72rem', fontWeight: 700 }}>Request sent</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
              {SERVICE_REQUESTS.map(request => {
                const isPending = serviceRequestPending === request.type
                const isRequested = serviceRequested === request.type
                return (
                  <button
                    type="button"
                    key={request.type}
                    onClick={() => void requestService(request.type)}
                    disabled={serviceRequestPending !== null || isRequested}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '11px 10px',
                      borderRadius: '10px',
                      border: `1px solid ${isRequested ? 'rgba(34,197,94,0.3)' : 'rgba(23,23,23,0.1)'}`,
                      background: isRequested ? 'rgba(34,197,94,0.1)' : '#F4F4F5',
                      color: isRequested ? '#15803D' : '#525252',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: serviceRequestPending !== null || isRequested ? 'default' : 'pointer',
                      opacity: serviceRequestPending !== null && !isPending ? 0.55 : 1,
                    }}
                  >
                    <span>{isPending ? '⏳' : isRequested ? '✓' : request.icon}</span>
                    {isRequested ? 'Requested' : request.label}
                  </button>
                )
              })}
            </div>
            {serviceError && <p style={{ color: '#B91C1C', fontSize: '0.75rem', marginTop: '9px' }}>{serviceError}</p>}
          </div>
        </section>
      )}

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
                        border: `2px solid ${state === 'done' ? '#22C55E' : state === 'active' ? '#FF6B35' : 'rgba(23,23,23,0.1)'}`,
                        background: state === 'done' ? 'rgba(34,197,94,0.12)' : state === 'active' ? 'rgba(255,107,53,0.12)' : '#FFFFFF',
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
                          background: state === 'done' ? '#22C55E' : 'rgba(23,23,23,0.1)',
                          minHeight: '24px',
                          transition: 'background 0.5s ease',
                        }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingTop: '10px' }}>
                    <p
                      className="customer-tracking-step-title"
                      style={{
                        fontWeight: state === 'pending' ? 400 : 600,
                        color: state === 'pending' ? '#8A8A8F' : '#262626',
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
          {order.items.map(item => {
            const draftQuantity = draftQuantities[item.id] ?? item.quantity
            return (
            <div
              key={item.id}
              className="customer-tracking-card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid rgba(23,23,23,0.06)',
              }}
            >
              <div>
                <span className="customer-tracking-item-title" style={{ fontWeight: 700, color: '#171717', fontSize: '0.9rem' }}>
                  {isEditingOrder ? draftQuantity : item.quantity}× {item.name}
                </span>
                {item.special_instructions && (
                  <p style={{ fontSize: '0.75rem', color: '#737373', marginTop: '2px' }}>
                    📝 {item.special_instructions}
                  </p>
                )}
              </div>
              {isEditingOrder ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginLeft: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setDraftQuantities(previous => ({ ...previous, [item.id]: Math.max(0, draftQuantity - 1) }))}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(23,23,23,0.1)', background: '#F4F4F5', color: draftQuantity === 0 ? '#B91C1C' : '#525252', cursor: 'pointer', fontSize: '1rem' }}
                    aria-label={`Decrease ${item.name}`}
                  >
                    {draftQuantity === 1 ? '🗑' : '−'}
                  </button>
                  <span style={{ minWidth: '18px', textAlign: 'center', color: '#171717', fontWeight: 700 }}>{draftQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setDraftQuantities(previous => ({ ...previous, [item.id]: Math.min(200, draftQuantity + 1) }))}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: '#FF6B35', color: 'white', cursor: 'pointer', fontSize: '1rem' }}
                    aria-label={`Increase ${item.name}`}
                  >
                    +
                  </button>
                </div>
              ) : (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '999px',
                    background: item.status === 'ready' ? 'rgba(34,197,94,0.12)' : item.status === 'preparing' ? 'rgba(255,107,53,0.12)' : '#F4F4F5',
                    color: item.status === 'ready' ? '#22C55E' : item.status === 'preparing' ? '#FF6B35' : '#737373',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    flexShrink: 0,
                    marginLeft: '8px',
                  }}
                >
                  {item.status}
                </span>
              )}
            </div>
            )
          })}
        </div>
        {isEditingOrder && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setIsEditingOrder(false)} disabled={isSavingEdit} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(23,23,23,0.1)', background: '#F4F4F5', color: '#525252', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button type="button" onClick={() => void saveOrderEdits()} disabled={isSavingEdit} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: isSavingEdit ? 'rgba(255,107,53,0.5)' : '#FF6B35', color: 'white', cursor: isSavingEdit ? 'wait' : 'pointer', fontWeight: 800 }}>{isSavingEdit ? 'Saving…' : 'Save changes'}</button>
            </div>
            {editError && <p style={{ color: '#B91C1C', fontSize: '0.75rem', marginTop: '8px' }}>{editError}</p>}
          </div>
        )}
      </div>

      {/* Price Summary */}
      <div style={{ padding: '0 20px 20px' }}>
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(23,23,23,0.06)',
            borderRadius: '16px',
            padding: '16px',
          }}
        >
          {order.subtotal > 0 && (
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
              color: '#171717',
              paddingTop: order.tax > 0 || order.service_charge > 0 ? '12px' : 0,
              borderTop: order.tax > 0 || order.service_charge > 0 ? '1px solid rgba(23,23,23,0.08)' : 'none',
            }}
          >
            <span>Total</span>
            <span style={{ color: '#FF6B35' }}>{formatPrice(order.total, order.currency_symbol)}</span>
          </div>
        </div>
      </div>

      {isTerminal && !isCancelled && (
        <div style={{ padding: '0 20px 20px' }}>
          <div className="customer-tracking-card" style={{ padding: '16px', background: '#FFFFFF', border: '1px solid rgba(23,23,23,0.06)', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>How was your visit?</h2>
            {feedbackSubmitted ? <p style={{ color: '#15803D', fontSize: '0.85rem' }}>Thanks for helping the restaurant improve.</p> : <>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>{[1, 2, 3, 4, 5].map(value => <button type="button" key={value} onClick={() => setFeedbackRating(value)} aria-label={`${value} stars`} style={{ border: 'none', background: 'transparent', color: value <= feedbackRating ? '#F59E0B' : '#D4D4D8', fontSize: '1.5rem', cursor: 'pointer' }}>★</button>)}</div>
              <textarea value={feedbackComment} onChange={event => setFeedbackComment(event.target.value)} placeholder="Tell us what went well or what we can improve" rows={2} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(23,23,23,0.12)', background: '#F7F7F8', color: '#171717', resize: 'vertical' }} />
              <button type="button" onClick={() => void submitFeedback()} disabled={!feedbackRating} style={{ marginTop: '10px', padding: '9px 14px', borderRadius: '8px', border: 'none', background: feedbackRating ? '#FF6B35' : '#E5E5E7', color: feedbackRating ? 'white' : '#8A8A8F', fontWeight: 700, cursor: feedbackRating ? 'pointer' : 'default' }}>Submit feedback</button>
              {feedbackError && <p style={{ color: '#B91C1C', fontSize: '0.75rem', marginTop: '7px' }}>{feedbackError}</p>}
            </>}
          </div>
        </div>
      )}

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
                  borderBottom: idx < order.events.length - 1 ? '1px solid rgba(23,23,23,0.06)' : 'none',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#525252', flexShrink: 0, minWidth: '70px' }}>
                  {format(new Date(event.created_at), 'h:mm a')}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#737373', textTransform: 'capitalize' }}>
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
      {tableToken && <CustomerBottomNav tableToken={tableToken} active="orders" orderToken={orderToken} cartHref={`/t/${tableToken}/menu?order=${encodeURIComponent(orderToken)}`} />}
    </div>
  )
}
