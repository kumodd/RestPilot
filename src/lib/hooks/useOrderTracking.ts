// ============================================================
// RestPilot — Order Tracking Hook (Polling fallback)
// Subscribes to live order status updates for customer view
// ============================================================

import { useEffect, useState, useCallback, useRef } from 'react'
import { getOrderByToken } from '@/app/actions/order'
import type { OrderTracking } from '@/lib/types/app.types'

export function useOrderTracking(orderToken: string) {
  const [order, setOrder] = useState<OrderTracking | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchOrder = useCallback(async () => {
    try {
      const data = await getOrderByToken(orderToken)

      if (!data) {
        setError('Order not found')
        return
      }

      // Cast instead of using any
      const anyData = data as {
        order_number: number
        status: string
        restaurant_tables: { table_number: string } | null
        restaurants: { currency_symbol: string } | null
        order_items: Array<{ item_name_snapshot: string; quantity: number; status: string; special_instructions: string | null }>
        subtotal: number
        tax: number
        service_charge: number
        total: number
        placed_at: string | null
        confirmed_at: string | null
        ready_at: string | null
        served_at: string | null
        order_events: Array<{ event_type: string; created_at: string }>
      }
      
      const tableData = anyData.restaurant_tables
      const restaurantData = anyData.restaurants

      setOrder({
        order_number: anyData.order_number,
        status: anyData.status as OrderTracking['status'],
        table_number: tableData?.table_number ?? '',
        items: (anyData.order_items ?? []).map(item => ({
          name: item.item_name_snapshot,
          quantity: item.quantity,
          status: item.status as OrderTracking['items'][0]['status'],
          special_instructions: item.special_instructions,
        })),
        subtotal: anyData.subtotal,
        tax: anyData.tax,
        service_charge: anyData.service_charge,
        total: anyData.total,
        currency_symbol: restaurantData?.currency_symbol ?? '₹',
        placed_at: anyData.placed_at,
        confirmed_at: anyData.confirmed_at,
        ready_at: anyData.ready_at,
        served_at: anyData.served_at,
        events: (anyData.order_events ?? []).map(e => ({
          event_type: e.event_type,
          created_at: e.created_at,
        })),
      })
    } catch {
      setError('Failed to load order')
    } finally {
      setIsLoading(false)
    }
  }, [orderToken])


  useEffect(() => {
    void fetchOrder()
  }, [fetchOrder])

  // Polling fallback since RLS blocks customer from using Realtime
  useEffect(() => {
    if (!order) return

    if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'rejected') {
      return // Stop polling if terminal state
    }

    timeoutRef.current = setTimeout(() => {
      fetchOrder()
    }, 5000)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [order, fetchOrder])

  return { order, isLoading, error, refetch: fetchOrder }
}
