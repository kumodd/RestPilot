// ============================================================
// RestPilot — Order Tracking Hook (Polling fallback)
// Subscribes to live order status updates for customer view
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import { getOrderByToken } from '@/app/actions/order'
import type { OrderTracking } from '@/lib/types/app.types'

function isSameOrder(previous: OrderTracking, next: OrderTracking) {
  if (
    previous.order_number !== next.order_number ||
    previous.status !== next.status ||
    previous.table_number !== next.table_number ||
    previous.subtotal !== next.subtotal ||
    previous.tax !== next.tax ||
    previous.service_charge !== next.service_charge ||
    previous.total !== next.total ||
    previous.placed_at !== next.placed_at ||
    previous.confirmed_at !== next.confirmed_at ||
    previous.ready_at !== next.ready_at ||
    previous.served_at !== next.served_at ||
    previous.currency_symbol !== next.currency_symbol ||
    previous.items.length !== next.items.length ||
    previous.events.length !== next.events.length
  ) {
    return false
  }

  return previous.items.every((item, index) => {
    const nextItem = next.items[index]
    return Boolean(
      nextItem &&
      item.id === nextItem.id &&
      item.menu_item_id === nextItem.menu_item_id &&
      item.name === nextItem.name &&
      item.quantity === nextItem.quantity &&
      item.status === nextItem.status &&
      item.special_instructions === nextItem.special_instructions,
    )
  }) && previous.events.every((event, index) => {
    const nextEvent = next.events[index]
    return Boolean(
      nextEvent &&
      event.event_type === nextEvent.event_type &&
      event.created_at === nextEvent.created_at,
    )
  })
}

export function useOrderTracking(orderToken: string) {
  const [order, setOrder] = useState<OrderTracking | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = useCallback(async (): Promise<OrderTracking | null> => {
    try {
      const data = await getOrderByToken(orderToken)

      if (!data) {
        setError('Order not found')
        return null
      }

      // Cast instead of using any
      const anyData = data as {
        order_number: number
        status: string
        restaurant_tables: { table_number: string } | null
        restaurants: { currency_symbol: string } | null
        order_items: Array<{ id: string; menu_item_id: string | null; item_name_snapshot: string; quantity: number; status: string; special_instructions: string | null }>
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

      const nextOrder: OrderTracking = {
        order_number: anyData.order_number,
        status: anyData.status as OrderTracking['status'],
        table_number: tableData?.table_number ?? '',
        items: (anyData.order_items ?? []).map(item => ({
          id: item.id,
          menu_item_id: item.menu_item_id,
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
      }

      setError(null)
      setOrder(previous => previous && isSameOrder(previous, nextOrder) ? previous : nextOrder)
      return nextOrder
    } catch {
      setError('Failed to load order')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [orderToken])

  useEffect(() => {
    let isCancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      const nextOrder = await fetchOrder()
      if (isCancelled || !nextOrder) return

      const isTerminal = nextOrder.status === 'completed' || nextOrder.status === 'cancelled' || nextOrder.status === 'rejected'
      if (!isTerminal) {
        timer = setTimeout(() => {
          void poll()
        }, 5000)
      }
    }

    void poll()

    return () => {
      isCancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [fetchOrder])

  return { order, isLoading, error, refetch: fetchOrder }
}
