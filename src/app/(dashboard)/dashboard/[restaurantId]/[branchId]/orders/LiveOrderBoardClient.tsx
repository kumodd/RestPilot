'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { formatPrice } from '@/lib/utils/price'
import type { OrderStatus } from '@/lib/types/database.types'
import { updateOrderStatus as updateOrderStatusAction } from '@/app/actions/order'

interface Order {
  id: string
  order_number: number
  status: OrderStatus
  total: number
  placed_at: string | null
  customer_name_snapshot: string | null
  restaurant_tables: { table_number: string; display_name: string | null } | null
  order_items: Array<{ item_name_snapshot: string; quantity: number }>
}

const BOARD_COLUMNS: Array<{
  id: string
  label: string
  statuses: OrderStatus[]
  color: string
  icon: string
}> = [
  { id: 'awaiting', label: 'Awaiting Waiter', statuses: ['placed', 'awaiting_waiter_verification', 'waiter_reviewing'], color: '#F59E0B', icon: '⏳' },
  { id: 'confirmed', label: 'Confirmed', statuses: ['confirmed'], color: '#8B5CF6', icon: '✓' },
  { id: 'kitchen', label: 'In Kitchen', statuses: ['kitchen_accepted', 'preparing'], color: '#FF6B35', icon: '👨‍🍳' },
  { id: 'ready', label: 'Ready', statuses: ['ready'], color: '#22C55E', icon: '🔔' },
  { id: 'served', label: 'Served', statuses: ['served'], color: '#16A34A', icon: '🍽️' },
]

interface Props {
  restaurantId: string
  branchId: string
}

export default function LiveOrderBoardClient({ restaurantId, branchId }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const supabase = createClient()

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, total, placed_at,
        customer_name_snapshot,
        restaurant_tables (table_number, display_name),
        order_items(item_name_snapshot, quantity)
      `)
      .eq('branch_id', branchId)
      .not('status', 'in', '("completed","cancelled","rejected")')
      .order('created_at', { ascending: true })

    setOrders((data as unknown as Order[]) ?? [])
    setIsLoading(false)
  }, [branchId, supabase])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`live-orders-${branchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `branch_id=eq.${branchId}` },
        fetchOrders
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [branchId, supabase, fetchOrders])

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (updatingOrderId) return
    try {
      setUpdatingOrderId(orderId)
      await updateOrderStatusAction(orderId, newStatus)
      await fetchOrders()
    } catch (e) {
      console.error(e)
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const getColumnOrders = (statuses: OrderStatus[]) =>
    orders.filter(o => statuses.includes(o.status))

  const getNextStatus = (status: OrderStatus): OrderStatus | null => {
    const map: Partial<Record<OrderStatus, OrderStatus>> = {
      placed: 'awaiting_waiter_verification',
      awaiting_waiter_verification: 'waiter_reviewing',
      waiter_reviewing: 'confirmed',
      confirmed: 'kitchen_accepted',
      kitchen_accepted: 'preparing',
      preparing: 'ready',
      ready: 'served',
      served: 'completed',
    }
    return map[status] ?? null
  }

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <div
        style={{
          padding: '0 24px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: '#1A1A2E',
          flexShrink: 0,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F5F5F5' }}>Live Order Board</h1>
          <p style={{ fontSize: '0.75rem', color: '#737373' }}>
            {orders.length} active order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: '999px',
            padding: '5px 12px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#22C55E',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
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
          Live
        </div>
      </div>

      {/* Board */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
        }}
      >
        {isLoading ? (
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: '#737373',
              paddingTop: '60px',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                border: '2px solid rgba(255,255,255,0.1)',
                borderTopColor: '#FF6B35',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }}
            />
            Loading orders...
          </div>
        ) : (
          BOARD_COLUMNS.map(col => {
            const colOrders = getColumnOrders(col.statuses)
            return (
              <div
                key={col.id}
                style={{
                  minWidth: '280px',
                  maxWidth: '320px',
                  flex: '0 0 auto',
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem' }}>{col.icon}</span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: col.color,
                      }}
                    >
                      {col.label}
                    </span>
                  </div>
                  <span
                    style={{
                      background: `${col.color}20`,
                      color: col.color,
                      borderRadius: '999px',
                      padding: '2px 9px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}
                  >
                    {colOrders.length}
                  </span>
                </div>

                {/* Column Body */}
                <div
                  style={{
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    minHeight: '100px',
                  }}
                >
                  {colOrders.length === 0 ? (
                    <p
                      style={{
                        textAlign: 'center',
                        color: '#525252',
                        fontSize: '0.8rem',
                        padding: '20px 0',
                      }}
                    >
                      No orders
                    </p>
                  ) : (
                    colOrders.map(order => {
                      const tableData = order.restaurant_tables
                      const tableLabel = tableData?.display_name ?? `Table ${tableData?.table_number ?? '?'}`
                      const nextStatus = getNextStatus(order.status)
                      const elapsed = order.placed_at
                        ? Math.floor((Date.now() - new Date(order.placed_at).getTime()) / 60000)
                        : 0
                      const isUrgent = elapsed > 20

                      return (
                        <div
                          key={order.id}
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            borderLeft: `3px solid ${col.color}`,
                            borderRadius: '10px',
                            padding: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onClick={() => setSelectedOrder(order)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#737373', textTransform: 'uppercase' }}>
                              #{order.order_number}
                            </span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: isUrgent ? '#EF4444' : '#737373',
                              }}
                            >
                              {elapsed}m ago
                            </span>
                          </div>

                          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#F5F5F5', marginBottom: '4px' }}>
                            {tableLabel}
                          </div>

                          {order.customer_name_snapshot && (
                            <div style={{ fontSize: '0.78rem', color: '#A3A3A3', marginBottom: '6px' }}>
                              {order.customer_name_snapshot}
                            </div>
                          )}

                          <div style={{ fontSize: '0.78rem', color: '#737373', marginBottom: '8px' }}>
                            {order.order_items.slice(0, 2).map((item, i) => (
                              <span key={i}>
                                {i > 0 && ', '}
                                {item.quantity}× {item.item_name_snapshot}
                              </span>
                            ))}
                            {order.order_items.length > 2 && (
                              <span> +{order.order_items.length - 2} more</span>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: col.color, fontSize: '0.9rem' }}>
                              {formatPrice(order.total)}
                            </span>

                            {nextStatus && (
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  updateOrderStatus(order.id, nextStatus)
                                }}
                                disabled={updatingOrderId === order.id}
                                style={{
                                  padding: '4px 10px',
                                  background: `${col.color}20`,
                                  border: `1px solid ${col.color}40`,
                                  borderRadius: '6px',
                                  color: col.color,
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: updatingOrderId === order.id ? 'not-allowed' : 'pointer',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: '32px',
                                  opacity: updatingOrderId === order.id ? 0.7 : 1,
                                }}
                              >
                                {updatingOrderId === order.id ? (
                                  <div
                                    style={{
                                      width: '12px',
                                      height: '12px',
                                      border: `2px solid ${col.color}40`,
                                      borderTopColor: col.color,
                                      borderRadius: '50%',
                                      animation: 'spin 0.7s linear infinite',
                                    }}
                                  />
                                ) : (
                                  '→'
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </main>
  )
}
