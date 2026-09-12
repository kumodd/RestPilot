'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { OrderStatus } from '@/lib/types/database.types'
import { updateOrderStatus as updateOrderStatusAction } from '@/app/actions/order'

interface KitchenOrderItem {
  id: string
  item_name_snapshot: string
  quantity: number
  status: string
  special_instructions: string | null
  menu_item_variants_snapshot: unknown
}

interface KitchenOrder {
  id: string
  order_number: number
  status: OrderStatus
  confirmed_at: string | null
  placed_at: string | null
  customer_name_snapshot: string | null
  notes: string | null
  restaurant_tables: { table_number: string; display_name: string | null } | null
  order_items: KitchenOrderItem[]
}

interface Props {
  restaurantId: string
  branchId: string
}

const KITCHEN_STATUSES: OrderStatus[] = ['confirmed', 'kitchen_accepted', 'preparing', 'ready']

export default function KitchenDisplayClient({ restaurantId, branchId }: Props) {
  const supabase = createClient()
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const audioRef = useRef<AudioContext | null>(null)
  const prevOrderIds = useRef<Set<string>>(new Set())

  const playAlert = useCallback(() => {
    try {
      const ctx = audioRef.current ?? new AudioContext()
      audioRef.current = ctx
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } catch { /* Audio not available */ }
  }, [])

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, confirmed_at, placed_at,
        customer_name_snapshot, notes,
        restaurant_tables (table_number, display_name),
        order_items (id, item_name_snapshot, quantity, status, special_instructions, menu_item_variants_snapshot)
      `)
      .eq('branch_id', branchId)
      .in('status', KITCHEN_STATUSES)
      .order('confirmed_at', { ascending: true, nullsFirst: false })

    const newOrders = (data as unknown as KitchenOrder[]) ?? []
    const newIds = new Set(newOrders.map(o => o.id))

    // Sound alert for genuinely new orders
    if (prevOrderIds.current.size > 0) {
      const hasNew = newOrders.some(o => !prevOrderIds.current.has(o.id))
      if (hasNew) playAlert()
    }
    prevOrderIds.current = newIds

    setOrders(newOrders)
    setLastRefresh(new Date())
    setIsLoading(false)
  }, [branchId, supabase, playAlert])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`kds-${branchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `branch_id=eq.${branchId}` }, fetchOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `branch_id=eq.${branchId}` }, fetchOrders)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchOrders()
        }
      })
    return () => { supabase.removeChannel(channel) }
  }, [branchId, supabase, fetchOrders])

  const advanceOrder = async (order: KitchenOrder) => {
    const next: Partial<Record<OrderStatus, OrderStatus>> = {
      confirmed: 'kitchen_accepted',
      kitchen_accepted: 'preparing',
      preparing: 'ready',
    }
    const nextStatus = next[order.status]
    if (!nextStatus) return

    try {
      await updateOrderStatusAction(order.id, nextStatus)
      fetchOrders()
    } catch (e) {
      console.error(e)
    }
  }

  const updateItemStatus = async (itemId: string, status: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('order_items') as any).update({ status }).eq('id', itemId)
    fetchOrders()
  }

  const STATUS_CONFIG: Record<string, { label: string; color: string; nextLabel: string }> = {
    confirmed:       { label: 'New', color: '#8B5CF6', nextLabel: 'Accept →' },
    kitchen_accepted: { label: 'Accepted', color: '#3B82F6', nextLabel: 'Start Cooking →' },
    preparing:       { label: 'Cooking', color: '#FF6B35', nextLabel: 'Mark Ready →' },
    ready:           { label: 'Ready', color: '#22C55E', nextLabel: '' },
  }

  const getElapsed = (dateStr: string | null) => {
    if (!dateStr) return 0
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  }

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#737373', background: '#0F0F1A' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        Loading kitchen display...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D1A', display: 'flex', flexDirection: 'column' }}>
      {/* KDS Header */}
      <div
        style={{
          height: '60px', background: '#1A1A2E', borderBottom: '2px solid rgba(255,107,53,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.3rem' }}>👨‍🍳</span>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#F5F5F5', letterSpacing: '-0.02em' }}>Kitchen Display</span>
            <span style={{ fontSize: '0.72rem', color: '#737373', display: 'block' }}>
              {orders.length} active order{orders.length !== 1 ? 's' : ''} · Updated {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Status legend */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.color }} />
              <span style={{ fontSize: '0.72rem', color: '#737373', fontWeight: 600 }}>{cfg.label}</span>
              <span style={{ fontSize: '0.68rem', color: '#525252' }}>({orders.filter(o => o.status === status).length})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Order tickets */}
      {orders.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <div style={{ fontSize: '4rem' }}>✅</div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#F5F5F5' }}>All Clear!</h2>
          <p style={{ color: '#737373', fontSize: '0.9rem' }}>No active orders in the kitchen right now.</p>
        </div>
      ) : (
        <div
          style={{
            flex: 1, overflowY: 'auto',
            padding: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            alignContent: 'start',
          }}
        >
          {orders.map(order => {
            const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, color: '#737373', nextLabel: '' }
            const refTime = order.confirmed_at ?? order.placed_at
            const elapsed = getElapsed(refTime)
            const isUrgent = elapsed >= 15
            const isCritical = elapsed >= 25

            return (
              <div
                key={order.id}
                style={{
                  background: '#1A1A2E',
                  border: `2px solid ${isCritical ? '#EF4444' : isUrgent ? '#F59E0B' : cfg.color}40`,
                  borderTop: `4px solid ${cfg.color}`,
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: isCritical
                    ? `0 0 20px rgba(239,68,68,0.15)`
                    : `0 4px 16px rgba(0,0,0,0.3)`,
                  animation: order.status === 'confirmed' ? 'pulse-border 2s ease-in-out infinite' : 'none',
                }}
              >
                {/* Ticket Header */}
                <div
                  style={{
                    padding: '14px 16px',
                    background: `${cfg.color}10`,
                    borderBottom: `1px solid ${cfg.color}20`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 900, fontSize: '1.4rem', color: '#F5F5F5', fontFamily: 'monospace' }}>
                        #{order.order_number}
                      </span>
                      <span
                        style={{
                          padding: '3px 8px', borderRadius: '999px',
                          background: `${cfg.color}25`, color: cfg.color,
                          fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                        }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#A3A3A3', marginTop: '3px' }}>
                      🪑 {order.restaurant_tables?.display_name ?? `Table ${order.restaurant_tables?.table_number ?? '?'}`}
                      {order.customer_name_snapshot && ` · ${order.customer_name_snapshot}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace',
                        color: isCritical ? '#EF4444' : isUrgent ? '#F59E0B' : '#737373',
                      }}
                    >
                      {elapsed}m
                    </div>
                    {isCritical && <div style={{ fontSize: '0.6rem', color: '#EF4444', fontWeight: 700 }}>URGENT</div>}
                  </div>
                </div>

                {/* Items */}
                <div style={{ padding: '12px 16px', flex: 1 }}>
                  {order.notes && (
                    <div
                      style={{
                        marginBottom: '10px', padding: '8px 10px',
                        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                        borderRadius: '8px', fontSize: '0.78rem', color: '#FCD34D',
                      }}
                    >
                      📝 {order.notes}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {order.order_items.map(item => {
                      const isDone = item.status === 'ready' || item.status === 'served'
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: '10px',
                            padding: '8px 10px', borderRadius: '8px',
                            background: isDone ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${isDone ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
                            opacity: isDone ? 0.6 : 1,
                          }}
                        >
                          <button
                            onClick={() => updateItemStatus(item.id, isDone ? 'preparing' : 'ready')}
                            style={{
                              width: '22px', height: '22px', borderRadius: '50%',
                              border: `2px solid ${isDone ? '#22C55E' : 'rgba(255,255,255,0.2)'}`,
                              background: isDone ? '#22C55E' : 'transparent',
                              color: 'white', cursor: 'pointer', flexShrink: 0,
                              fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              marginTop: '1px',
                            }}
                          >
                            {isDone ? '✓' : ''}
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                              <span
                                style={{
                                  fontWeight: 700, fontSize: '0.9rem',
                                  color: isDone ? '#737373' : '#F5F5F5',
                                  textDecoration: isDone ? 'line-through' : 'none',
                                }}
                              >
                                {item.quantity}× {item.item_name_snapshot}
                              </span>
                            </div>
                            {item.special_instructions && (
                              <p style={{ fontSize: '0.72rem', color: '#F59E0B', marginTop: '3px' }}>
                                ⚠ {item.special_instructions}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Action Button */}
                {cfg.nextLabel && (
                  <button
                    onClick={() => advanceOrder(order)}
                    style={{
                      width: '100%', padding: '14px',
                      background: cfg.color, border: 'none',
                      color: 'white', fontSize: '0.9rem', fontWeight: 800,
                      cursor: 'pointer', transition: 'opacity 0.2s',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {cfg.nextLabel}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(139,92,246,0); }
        }
      `}</style>
    </div>
  )
}
