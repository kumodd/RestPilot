'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { TouchEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  CheckCheck,
  ChefHat,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  Inbox,
  Info,
  ReceiptText,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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

type NotificationTone = 'orange' | 'blue' | 'green' | 'red' | 'purple' | 'neutral'

const NOTIFICATION_META: Record<string, { icon: LucideIcon; tone: NotificationTone }> = {
  new_order: { icon: ClipboardList, tone: 'orange' },
  order_reviewing: { icon: Info, tone: 'blue' },
  order_confirmed: { icon: ChefHat, tone: 'purple' },
  order_preparing: { icon: ChefHat, tone: 'orange' },
  order_ready: { icon: Bell, tone: 'green' },
  order_served: { icon: ReceiptText, tone: 'blue' },
  order_completed: { icon: CheckCheck, tone: 'green' },
  order_cancelled: { icon: CircleAlert, tone: 'red' },
  order_item_added: { icon: ClipboardList, tone: 'orange' },
  order_item_modified: { icon: Info, tone: 'blue' },
  order_item_removed: { icon: CircleAlert, tone: 'red' },
  payment_received: { icon: ReceiptText, tone: 'green' },
  bill_requested: { icon: ReceiptText, tone: 'purple' },
  service_request: { icon: Bell, tone: 'orange' },
}

function relativeTime(value: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function getNotificationMeta(type: string) {
  return NOTIFICATION_META[type] ?? { icon: Inbox, tone: 'neutral' as const }
}

export default function NotificationCenter({ userId }: { userId: string }) {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const anchorRef = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissedToastIds, setDismissedToastIds] = useState<string[]>([])
  const toastTouchStart = useRef<{ id: string; x: number; y: number } | null>(null)

  const loadNotifications = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    // action_url is added by migration 019; the cast keeps older generated
    // client types usable until Supabase types are regenerated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: queryError } = await (supabase.from('notifications') as any)
      .select('id, title, body, notification_type, is_read, action_url, created_at')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (queryError) {
      setError('We couldn\'t load notifications.')
    } else {
      setNotifications((data as NotificationRow[]) ?? [])
    }
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

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const markRead = async (notification: NotificationRow) => {
    if (!notification.is_read) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: rpcError } = await (supabase.rpc as any)('mark_notification_read', { p_notification_id: notification.id })
      if (rpcError) {
        setError('We couldn\'t update that notification.')
        return
      }
      setNotifications(current => current.map(item => item.id === notification.id ? { ...item, is_read: true } : item))
    }
    if (notification.action_url) {
      setIsOpen(false)
      router.push(notification.action_url)
    }
  }

  const markAllRead = async () => {
    const unread = notifications.filter(notification => !notification.is_read)
    if (unread.length === 0) return

    setIsMarkingAllRead(true)
    setError(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await Promise.all(unread.map(notification => (supabase.rpc as any)('mark_notification_read', { p_notification_id: notification.id })))
    const failed = results.some(result => result.error)
    if (failed) {
      setError('Some notifications could not be marked as read. Try again.')
    } else {
      setNotifications(current => current.map(notification => ({ ...notification, is_read: true })))
    }
    setIsMarkingAllRead(false)
  }

  const unread = notifications.filter(notification => !notification.is_read)
  const read = notifications.filter(notification => notification.is_read)
  const unreadCount = unread.length
  const toastNotifications = unread.filter(notification => !dismissedToastIds.includes(notification.id)).slice(0, 3)

  const dismissToast = (notificationId: string) => {
    setDismissedToastIds(current => current.includes(notificationId) ? current : [...current, notificationId])
  }

  const handleToastTouchStart = (notificationId: string, event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0]
    toastTouchStart.current = { id: notificationId, x: touch.clientX, y: touch.clientY }
  }

  const handleToastTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = toastTouchStart.current
    toastTouchStart.current = null
    if (!start) return
    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (Math.abs(deltaX) > 44 && Math.abs(deltaX) > Math.abs(deltaY)) dismissToast(start.id)
  }

  const renderNotification = (notification: NotificationRow) => {
    const { icon: Icon, tone } = getNotificationMeta(notification.notification_type)
    return (
      <button
        type="button"
        key={notification.id}
        className={`notification-item ${notification.is_read ? 'is-read' : 'is-unread'}`}
        onClick={() => void markRead(notification)}
        aria-label={`${notification.title}${notification.action_url ? ', open details' : ''}`}
      >
        <span className={`notification-item-icon notification-tone-${tone}`}>
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <span className="notification-item-copy">
          <span className="notification-item-title-row">
            <span className="notification-item-title">{notification.title}</span>
            {!notification.is_read && <span className="notification-unread-dot" aria-label="Unread" />}
          </span>
          {notification.body && <span className="notification-item-body">{notification.body}</span>}
          <span className="notification-item-meta">
            {relativeTime(notification.created_at)}
            {notification.action_url && <><span aria-hidden="true">·</span><span>View details</span><ExternalLink size={11} /></>}
          </span>
        </span>
      </button>
    )
  }

  const renderToast = (notification: NotificationRow) => {
    const { icon: Icon, tone } = getNotificationMeta(notification.notification_type)
    return (
      <article
        key={notification.id}
        className="notification-toast"
        role="button"
        tabIndex={0}
        onClick={() => void markRead(notification)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            void markRead(notification)
          }
        }}
        onTouchStart={event => handleToastTouchStart(notification.id, event)}
        onTouchEnd={handleToastTouchEnd}
        aria-label={`${notification.title}, swipe to dismiss`}
      >
        <span className={`notification-item-icon notification-tone-${tone}`}>
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <span className="notification-toast-copy">
          <strong>{notification.title}</strong>
          {notification.body && <span>{notification.body}</span>}
          <small>Swipe to dismiss · {relativeTime(notification.created_at)}</small>
        </span>
        <button
          type="button"
          className="notification-toast-close"
          onClick={event => {
            event.stopPropagation()
            dismissToast(notification.id)
          }}
          aria-label={`Dismiss ${notification.title}`}
        >
          <X size={15} />
        </button>
      </article>
    )
  }

  return (
    <>
      {toastNotifications.length > 0 && !isOpen && (
        <div className="notification-toast-stack" aria-live="polite" aria-label="New notifications">
          {toastNotifications.map(renderToast)}
        </div>
      )}

      <div className="notification-anchor" ref={anchorRef}>
        <button
          type="button"
          className={`notification-toggle ${unreadCount > 0 ? 'has-unread' : ''}`}
          onClick={() => setIsOpen(value => !value)}
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <span className="notification-toggle-icon"><Bell size={17} strokeWidth={2.2} /></span>
          <span className="notification-toggle-label">Notifications</span>
          {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          <span className="notification-toggle-status">{unreadCount > 0 ? 'Needs attention' : 'All caught up'}</span>
        </button>

      {isOpen && (
        <>
          <button type="button" className="notification-backdrop" onClick={() => setIsOpen(false)} aria-label="Close notifications" />
          <section className="notification-popover" role="dialog" aria-label="Notifications" aria-modal="false">
            <header className="notification-popover-header">
              <div>
                <div className="notification-popover-title-row">
                  <h2>Notifications</h2>
                  {unreadCount > 0 && <span className="notification-header-count">{unreadCount} new</span>}
                </div>
                <p>{unreadCount > 0 ? 'Stay on top of live restaurant activity.' : 'You are all caught up.'}</p>
              </div>
              <div className="notification-popover-actions">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="notification-action-button"
                    onClick={() => void markAllRead()}
                    disabled={isMarkingAllRead}
                  >
                    <CheckCheck size={14} />
                    {isMarkingAllRead ? 'Updating…' : 'Mark all read'}
                  </button>
                )}
                <button type="button" className="notification-close-button" onClick={() => setIsOpen(false)} aria-label="Close notifications">
                  <X size={17} />
                </button>
              </div>
            </header>

            {error && (
              <div className="notification-error" role="alert">
                <span>{error}</span>
                <button type="button" onClick={() => void loadNotifications()}>Retry</button>
              </div>
            )}

            {isLoading ? (
              <div className="notification-state">
                <span className="notification-spinner" />
                <span>Loading notifications…</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-state notification-empty-state">
                <span className="notification-empty-icon"><Inbox size={22} /></span>
                <strong>No notifications yet</strong>
                <span>New orders and service requests will appear here.</span>
              </div>
            ) : (
              <div className="notification-list">
                {unread.length > 0 && (
                  <div className="notification-section">
                    <div className="notification-section-heading">New</div>
                    {unread.map(renderNotification)}
                  </div>
                )}
                {read.length > 0 && (
                  <div className="notification-section">
                    <div className="notification-section-heading">Earlier</div>
                    {read.map(renderNotification)}
                  </div>
                )}
              </div>
            )}

            {!isLoading && notifications.length > 0 && (
              <footer className="notification-popover-footer">Showing your latest {notifications.length} notification{notifications.length === 1 ? '' : 's'}</footer>
            )}
          </section>
        </>
      )}
      </div>
    </>
  )
}
