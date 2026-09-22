'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface NotificationRow {
  id: string
  title: string
  body: string | null
  notification_type: string
  is_read: boolean
  action_url: string | null
  created_at: string
}

function relativeTime(value: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function NotificationCenter({ userId }: { userId: string }) {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const loadNotifications = useCallback(async () => {
    setIsLoading(true)
    // action_url is added by migration 019; the cast keeps older generated
    // client types usable until Supabase types are regenerated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('notifications') as any)
      .select('id, title, body, notification_type, is_read, action_url, created_at')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifications((data as NotificationRow[]) ?? [])
    setIsLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    // The initial load is asynchronous because it crosses the Supabase
    // boundary; the realtime callback handles subsequent updates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNotifications()
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}`,
      }, () => { void loadNotifications() })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [loadNotifications, supabase, userId])

  const markRead = async (notification: NotificationRow) => {
    if (!notification.is_read) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.rpc as any)('mark_notification_read', { p_notification_id: notification.id })
      setNotifications(current => current.map(item => item.id === notification.id ? { ...item, is_read: true } : item))
    }
    if (notification.action_url) {
      setIsOpen(false)
      router.push(notification.action_url)
    }
  }

  const unreadCount = notifications.filter(notification => !notification.is_read).length

  return (
    <div style={{ position: 'relative', padding: '0 16px 16px' }}>
      <button
        type="button"
        onClick={() => setIsOpen(value => !value)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', borderRadius: '9px', cursor: 'pointer',
          color: '#D4D4D8', background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '1rem' }}>🔔</span>
        <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600 }}>Notifications</span>
        {unreadCount > 0 && (
          <span style={{ minWidth: '21px', padding: '2px 6px', borderRadius: '999px', background: '#EF4444', color: 'white', fontSize: '0.68rem', fontWeight: 800, textAlign: 'center' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', zIndex: 30, left: '16px', top: '48px', width: 'min(360px, calc(100vw - 32px))',
          maxHeight: '420px', overflow: 'auto', background: '#1A1A2E',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
          boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 700, color: '#F5F5F5' }}>
            Notifications
          </div>
          {isLoading ? (
            <div style={{ padding: '24px', color: '#737373', fontSize: '0.82rem' }}>Loading…</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '24px', color: '#737373', fontSize: '0.82rem' }}>You are all caught up.</div>
          ) : notifications.map(notification => (
            <button
              type="button"
              key={notification.id}
              onClick={() => void markRead(notification)}
              style={{
                width: '100%', padding: '13px 16px', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: notification.is_read ? 'transparent' : 'rgba(255,107,53,0.08)',
                color: '#F5F5F5', textAlign: 'left', cursor: notification.action_url ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.75rem', color: notification.is_read ? '#525252' : '#FF6B35' }}>●</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: notification.is_read ? 600 : 800 }}>{notification.title}</div>
                  {notification.body && <div style={{ marginTop: '3px', fontSize: '0.75rem', color: '#A1A1AA', lineHeight: 1.4 }}>{notification.body}</div>}
                  <div style={{ marginTop: '5px', fontSize: '0.68rem', color: '#525252' }}>{relativeTime(notification.created_at)}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
