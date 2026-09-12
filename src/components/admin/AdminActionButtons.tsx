'use client'

import { useState, useTransition } from 'react'
import {
  suspendOwnerAction,
  activateOwnerAction,
  suspendRestaurantAction,
  activateRestaurantAction,
  disableStaffAction,
  enableStaffAction,
} from '@/app/actions/admin'

// ── Owner Suspend/Activate ─────────────────────────────────────────────────

export function OwnerLifecycleButtons({
  ownerId,
  isActive,
}: {
  ownerId: string
  isActive: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const handleAction = () => {
    if (!confirmed) {
      setConfirmed(true)
      return
    }
    setError(null)
    setConfirmed(false)
    startTransition(async () => {
      const result = isActive
        ? await suspendOwnerAction(ownerId)
        : await activateOwnerAction(ownerId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
      {confirmed && (
        <p style={{ fontSize: '0.72rem', color: '#FBBF24', margin: 0 }}>
          {isActive
            ? '⚠️ This will suspend the owner and all their restaurants. Click again to confirm.'
            : '⚠️ This will reactivate the owner. Click again to confirm.'}
        </p>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        {confirmed && (
          <button
            onClick={() => setConfirmed(false)}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: '#737373', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}
        <button
          id={`owner-${isActive ? 'suspend' : 'activate'}-${ownerId}`}
          onClick={handleAction}
          disabled={isPending}
          style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
            background: confirmed
              ? (isActive ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)')
              : (isActive ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)'),
            border: `1px solid ${isActive ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
            color: isActive ? '#EF4444' : '#22C55E',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending
            ? (isActive ? 'Suspending...' : 'Activating...')
            : confirmed
              ? (isActive ? '🔴 Confirm Suspend' : '✅ Confirm Activate')
              : (isActive ? 'Suspend Owner' : 'Activate Owner')
          }
        </button>
      </div>
      {error && (
        <p style={{ fontSize: '0.72rem', color: '#EF4444', margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  )
}

// ── Restaurant Suspend/Activate ────────────────────────────────────────────

export function RestaurantLifecycleButtons({
  restaurantId,
  isActive,
}: {
  restaurantId: string
  isActive: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const handleAction = () => {
    if (!confirmed) { setConfirmed(true); return }
    setError(null); setConfirmed(false)
    startTransition(async () => {
      const result = isActive
        ? await suspendRestaurantAction(restaurantId)
        : await activateRestaurantAction(restaurantId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
      {confirmed && (
        <p style={{ fontSize: '0.7rem', color: '#FBBF24', margin: 0 }}>
          {isActive ? '⚠️ Will pause orders. Click again to confirm.' : '⚠️ Will resume restaurant. Confirm?'}
        </p>
      )}
      <div style={{ display: 'flex', gap: '6px' }}>
        {confirmed && (
          <button
            onClick={() => setConfirmed(false)}
            style={{
              padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
              color: '#737373', cursor: 'pointer',
            }}
          >Cancel</button>
        )}
        <button
          id={`restaurant-${isActive ? 'suspend' : 'activate'}-${restaurantId}`}
          onClick={handleAction}
          disabled={isPending}
          style={{
            padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
            background: confirmed
              ? (isActive ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)')
              : 'transparent',
            border: `1px solid ${isActive ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
            color: isActive ? '#EF4444' : '#22C55E',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending
            ? '...'
            : confirmed
              ? (isActive ? 'Confirm Suspend' : 'Confirm Activate')
              : (isActive ? 'Suspend' : 'Activate')
          }
        </button>
      </div>
      {error && <p style={{ fontSize: '0.7rem', color: '#EF4444', margin: 0 }}>{error}</p>}
    </div>
  )
}

// ── Staff Disable/Enable ───────────────────────────────────────────────────

export function StaffToggleButton({
  staffId,
  isActive,
}: {
  staffId: string
  isActive: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleToggle = () => {
    setError(null)
    startTransition(async () => {
      const result = isActive
        ? await disableStaffAction(staffId)
        : await enableStaffAction(staffId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
      <button
        id={`staff-${isActive ? 'disable' : 'enable'}-${staffId}`}
        onClick={handleToggle}
        disabled={isPending}
        title={isActive ? 'Disable this staff member' : 'Enable this staff member'}
        style={{
          padding: '3px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700,
          background: isActive ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
          border: `1px solid ${isActive ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
          color: isActive ? '#EF4444' : '#22C55E',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? '…' : isActive ? 'Disable' : 'Enable'}
      </button>
      {error && <p style={{ fontSize: '0.65rem', color: '#EF4444', margin: 0 }}>{error}</p>}
    </div>
  )
}
