'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types/app.types'
import type { User } from '@supabase/supabase-js'

interface Props {
  profile: Profile
  user: User
  restaurants: { id: string; name: string }[]
}

export default function DashboardNav({ profile, user, restaurants }: Props) {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const restaurantId = params.restaurantId as string | undefined
  const urlBranchId = params.branchId as string | undefined
  const [defaultBranchId, setDefaultBranchId] = useState<string | null>(null)

  // Fetch a default branch if none is in the URL so we can construct Operations links


  useEffect(() => {
    if (restaurantId && !urlBranchId) {
      const fetchFirstBranch = async () => {
        const { data } = await supabase
          .from('branches')
          .select('id')
          .eq('restaurant_id', restaurantId)
          .eq('is_active', true)
          .limit(1)
          .single()
        if (data) {
          setDefaultBranchId((data as { id: string }).id)
        }
      }
      fetchFirstBranch()
    }
  }, [restaurantId, urlBranchId, supabase])

  const branchId = urlBranchId || defaultBranchId

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  // Base nav items that require a restaurant context
  const getNavItems = () => {
    if (!restaurantId) return []
    
    // We prefix with the restaurantId
    const base = `/dashboard/${restaurantId}`
    
    // Operations links require a branchId
    const bBase = branchId ? `/dashboard/${restaurantId}/${branchId}` : '#'

    return [
      { label: 'Overview', href: `${base}`, icon: '🏠', exact: true },
      ...(branchId ? [
        { label: 'Live Orders', href: `${bBase}/orders`, icon: '📊' },
        { label: 'Kitchen Display', href: `${bBase}/kitchen`, icon: '👨‍🍳' },
        { label: 'Tables & QR', href: `${bBase}/tables`, icon: '🪑' },
        { label: 'Cashier', href: `${bBase}/cashier`, icon: '💰' },
        { label: 'Reports', href: `${bBase}/reports`, icon: '📈' },
      ] : []),
      
      { label: 'Menu', href: `${base}/menu`, icon: '🍽️', section: 'Management' },
      { label: 'Staff', href: `${base}/staff`, icon: '👥', section: 'Management' },
      { label: 'Suggestions', href: `${base}/suggestions`, icon: '💡', section: 'Management' },
      { label: 'Settings', href: `${base}/settings`, icon: '⚙️', section: 'Management' },
    ]
  }

  const navItems = getNavItems()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #FF6B35, #E5562B)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              flexShrink: 0,
            }}
          >
            🍽️
          </div>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#F5F5F5', letterSpacing: '-0.02em' }}>
            RestPilot
          </span>
        </Link>
      </div>

      {/* Restaurant Switcher */}
      <div style={{ padding: '0 16px', marginBottom: '16px' }}>
        <select
          value={restaurantId || ''}
          onChange={(e) => {
            const val = e.target.value
            if (val === '') router.push('/dashboard')
            else router.push(`/dashboard/${val}`)
          }}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#F5F5F5',
            fontSize: '0.9rem',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="" style={{ color: '#000' }}>Global Overview</option>
          {restaurants.map(r => (
            <option key={r.id} value={r.id} style={{ color: '#000' }}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {restaurantId ? (
          <>
            <span className="sidebar-section-label">Operations</span>
            {navItems.filter(i => !i.section).map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive(item.href, item.exact) ? 'active' : ''}`}
              >
                <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}

            <span className="sidebar-section-label" style={{ marginTop: '16px' }}>Management</span>
            {navItems.filter(i => i.section === 'Management').map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive(item.href, item.exact) ? 'active' : ''}`}
              >
                <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        ) : (
           <div style={{ padding: '0 16px', color: '#737373', fontSize: '0.85rem' }}>
             Select a restaurant to view operations.
           </div>
        )}

        {profile.role === 'platform_admin' && (
          <>
            <span className="sidebar-section-label" style={{ marginTop: '16px' }}>Admin</span>
            <Link
              href="/admin"
              className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>🔧</span>
              Platform Admin
            </Link>
          </>
        )}
      </nav>

      {/* User Section */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px',
            borderRadius: '10px',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF6B35, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              color: 'white',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(profile.full_name ?? user.email ?? 'U')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#F5F5F5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.full_name ?? 'User'}
            </p>
            <p style={{ fontSize: '0.7rem', color: '#737373', textTransform: 'capitalize' }}>
              {profile.role.replace('_', ' ')}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            padding: '8px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            color: '#737373',
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  )
}
