// ============================================================
// RestPilot — Customer Browser Storage Hook
// Persists customer name/phone per restaurant (BR-007)
// ============================================================

import { useState, useCallback } from 'react'
import type { CustomerBrowserData } from '@/lib/types/app.types'

const STORAGE_PREFIX = 'restpilot_customer_'

export function useCustomerStorage(restaurantId: string) {
  const storageKey = `${STORAGE_PREFIX}${restaurantId}`

  const load = (): CustomerBrowserData | null => {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) return JSON.parse(stored) as CustomerBrowserData
    } catch {}
    return null
  }

  const [customerData, setCustomerData] = useState<CustomerBrowserData | null>(load)

  const save = useCallback((data: Pick<CustomerBrowserData, 'name' | 'phone'>) => {
    const toSave: CustomerBrowserData = { ...data, savedAt: new Date().toISOString() }
    try {
      localStorage.setItem(storageKey, JSON.stringify(toSave))
    } catch {}
    setCustomerData(toSave)
  }, [storageKey])

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
    } catch {}
    setCustomerData(null)
  }, [storageKey])

  return { customerData, save, clear }
}
