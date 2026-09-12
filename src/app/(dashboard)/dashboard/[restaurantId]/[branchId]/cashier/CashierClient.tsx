'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils/price'
import { processPayment } from '@/app/actions/payment'
import type { OrderStatus } from '@/lib/types/database.types'

interface Order {
  id: string
  order_number: number
  status: OrderStatus
  total: number
  placed_at: string | null
  customer_name_snapshot: string | null
  restaurant_tables: { table_number: string; display_name: string | null } | null
}

interface Props {
  restaurantId: string
  branchId: string | null
}

export default function CashierClient({ restaurantId, branchId }: Props) {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, total, placed_at,
        customer_name_snapshot,
        restaurant_tables (table_number, display_name),
        order_items(item_name_snapshot, quantity, price, special_instructions),
        payments(amount, payment_method, status, created_at)
      `)
      .eq('branch_id', branchId)
      .in('status', ['ready', 'completed'])
      .order('placed_at', { ascending: false })
      .limit(50)

    setOrders((data as unknown as Order[]) ?? [])
    setIsLoading(false)
  }, [branchId, supabase])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    const channel = supabase
      .channel(`cashier-${branchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `branch_id=eq.${branchId}` },
        fetchOrders
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `branch_id=eq.${branchId}` },
        fetchOrders
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [branchId, supabase, fetchOrders])

  const handleCheckout = async (order: Order, method: 'cash' | 'card' | 'upi') => {
    if (!confirm(`Confirm checkout of ${formatPrice(order.total)} via ${method.toUpperCase()}?`)) return
    
    setIsProcessing(true)
    setError(null)
    try {
      await processPayment(order.id, method, order.total, `CASHIER_${Date.now()}`)
      await fetchOrders()
    } catch (e: any) {
      setError(e.message || 'Failed to process payment')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading cashier system...
      </div>
    )
  }

  return (
    <main className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cashier & Billing</h1>
          <p className="page-subtitle">Process payments for served orders</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', background: '#EF444420', color: '#EF4444', borderRadius: '8px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💳</div>
          <h1 className="empty-state-title">No Pending Bills</h1>
          <p className="empty-state-desc">All served orders have been paid and completed.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {orders.map(order => {
            const tableLabel = order.restaurant_tables?.display_name ?? `Table ${order.restaurant_tables?.table_number ?? '?'}`
            
            return (
              <div
                key={order.id}
                style={{
                  background: '#1A1A2E',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F5F5F5' }}>
                      #{order.order_number}
                    </span>
                    <div style={{ color: '#A3A3A3', fontSize: '0.9rem', marginTop: '4px' }}>
                      {tableLabel} {order.customer_name_snapshot && `· ${order.customer_name_snapshot}`}
                    </div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#22C55E' }}>
                    {formatPrice(order.total)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleCheckout(order, 'cash')}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '12px', fontSize: '0.9rem', fontWeight: 700 }}
                  >
                    💵 Cash
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleCheckout(order, 'card')}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '12px', fontSize: '0.9rem', fontWeight: 700 }}
                  >
                    💳 Card
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleCheckout(order, 'upi')}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '12px', fontSize: '0.9rem', fontWeight: 700 }}
                  >
                    📱 UPI
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
