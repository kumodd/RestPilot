'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/types/app.types'
import type { User } from '@supabase/supabase-js'

const NAV_ITEMS = [
  { label: 'Overview', href: '/admin', icon: '🏠', exact: true },
  { label: 'Owners', href: '/admin/owners', icon: '👤' },
  { label: 'Restaurants', href: '/admin/restaurants', icon: '🏪' },
  { label: 'Subscriptions', href: '/admin/subscriptions', icon: '💳' },
  { label: 'Analytics', href: '/admin/analytics', icon: '📊' },
]

interface Props {
  profile: Profile
  user: User
}

export default function AdminNav({ profile, user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div
          style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', flexShrink: 0,
          }}
        >
          🔧
        </div>
        <div>
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#F5F5F5', letterSpacing: '-0.02em', display: 'block' }}>
            RestPilot
          </span>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Platform Admin
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Admin</span>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${isActive(item.href, item.exact) ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <span className="sidebar-section-label" style={{ marginTop: '16px' }}>Navigation</span>
        <Link href="/dashboard" className="nav-link">
          <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>↩</span>
          Dashboard
        </Link>
      </nav>

      {/* User */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', marginBottom: '8px' }}>
          <div
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem', color: 'white', fontWeight: 700, flexShrink: 0,
            }}
          >
            {(profile.full_name ?? user.email ?? 'A')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#F5F5F5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.full_name ?? 'Admin'}
            </p>
            <p style={{ fontSize: '0.7rem', color: '#8B5CF6' }}>Platform Admin</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', padding: '8px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px', color: '#737373', fontSize: '0.8rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  )
}
