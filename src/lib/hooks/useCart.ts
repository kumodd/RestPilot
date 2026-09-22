// ============================================================
// RestPilot — Cart State Hook
// Browser-side cart with localStorage persistence per table session
// ============================================================

import { useState, useCallback, useEffect } from 'react'
import type { CartItem } from '@/lib/types/app.types'

interface UseCartOptions {
  tableToken: string
  restaurantId: string
}

interface CartState {
  items: CartItem[]
  totalItems: number
  subtotal: number
}

const CART_STORAGE_PREFIX = 'restpilot_cart_'

export function useCart({ tableToken, restaurantId }: UseCartOptions) {
  const storageKey = `${CART_STORAGE_PREFIX}${tableToken}`

  const [cart, setCart] = useState<CartState>(() => {
    if (typeof window === 'undefined') return { items: [], totalItems: 0, subtotal: 0 }
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed: CartItem[] = JSON.parse(stored)
        return {
          items: parsed,
          totalItems: parsed.reduce((acc, i) => acc + i.quantity, 0),
          subtotal: parsed.reduce((acc, i) => acc + i.lineTotal, 0),
        }
      }
    } catch {}
    return { items: [], totalItems: 0, subtotal: 0 }
  })

  const computeLineTotal = useCallback((item: Omit<CartItem, 'lineTotal'>): number => {
    const variantTotal = item.selectedVariants.reduce((acc, v) => acc + v.priceDelta, 0)
    const addonTotal = item.selectedAddons.reduce((acc, a) => acc + a.price, 0)
    return (item.basePrice + variantTotal + addonTotal) * item.quantity
  }, [])

  const persistCart = useCallback((items: CartItem[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items))
    } catch {}
  }, [storageKey])

  const addItem = useCallback((item: Omit<CartItem, 'lineTotal' | 'cartItemId'>) => {
    setCart(prev => {
      // Check if identical item exists (same item + same variants/addons)
      const existingIndex = prev.items.findIndex(
        i =>
          i.menuItemId === item.menuItemId &&
          JSON.stringify(i.selectedVariants) === JSON.stringify(item.selectedVariants) &&
          JSON.stringify(i.selectedAddons) === JSON.stringify(item.selectedAddons)
      )

      let newItems: CartItem[]
      if (existingIndex >= 0) {
        newItems = prev.items.map((i, idx) => {
          if (idx !== existingIndex) return i
          const newQty = i.quantity + item.quantity
          return { ...i, quantity: newQty, lineTotal: computeLineTotal({ ...i, quantity: newQty }) }
        })
      } else {
        const newItem: CartItem = {
          ...item,
          cartItemId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          lineTotal: computeLineTotal(item as any),
        }
        newItems = [...prev.items, newItem]
      }

      persistCart(newItems)
      return {
        items: newItems,
        totalItems: newItems.reduce((acc, i) => acc + i.quantity, 0),
        subtotal: newItems.reduce((acc, i) => acc + i.lineTotal, 0),
      }
    })
  }, [computeLineTotal, persistCart])

  const removeItem = useCallback((cartItemId: string) => {
    setCart(prev => {
      const newItems = prev.items.filter(i => i.cartItemId !== cartItemId)
      persistCart(newItems)
      return {
        items: newItems,
        totalItems: newItems.reduce((acc, i) => acc + i.quantity, 0),
        subtotal: newItems.reduce((acc, i) => acc + i.lineTotal, 0),
      }
    })
  }, [persistCart])

  const updateQuantity = useCallback((cartItemId: string, delta: number) => {
    setCart(prev => {
      const newItems = prev.items
        .map(i => {
          if (i.cartItemId !== cartItemId) return i
          const newQty = Math.max(0, i.quantity + delta)
          if (newQty === 0) return null
          return { ...i, quantity: newQty, lineTotal: computeLineTotal({ ...i, quantity: newQty }) }
        })
        .filter(Boolean) as CartItem[]

      persistCart(newItems)
      return {
        items: newItems,
        totalItems: newItems.reduce((acc, i) => acc + i.quantity, 0),
        subtotal: newItems.reduce((acc, i) => acc + i.lineTotal, 0),
      }
    })
  }, [computeLineTotal, persistCart])

  const clearCart = useCallback(() => {
    persistCart([])
    setCart({ items: [], totalItems: 0, subtotal: 0 })
  }, [persistCart])

  const getItemCount = useCallback((menuItemId: string): number => {
    return cart.items
      .filter(i => i.menuItemId === menuItemId)
      .reduce((acc, i) => acc + i.quantity, 0)
  }, [cart.items])

  return {
    items: cart.items,
    totalItems: cart.totalItems,
    subtotal: cart.subtotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemCount,
  }
}
