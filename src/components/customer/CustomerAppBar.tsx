'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  restaurant: {
    name: string
    logo_url: string | null
    primary_color: string | null
    secondary_color: string | null
  }
  title: string
  subtitle?: string
  backHref?: string
  right?: ReactNode
}

export default function CustomerAppBar({ restaurant, title, subtitle, backHref, right }: Props) {
  const primaryColor = restaurant.primary_color ?? '#FF6B35'

  return (
    <header className="customer-app-bar">
      <div className="customer-app-bar-inner">
        {backHref ? (
          <Link href={backHref} className="customer-icon-button" aria-label="Go back">
            <ArrowLeft size={19} strokeWidth={2.3} />
          </Link>
        ) : (
          <div className="customer-brand-mark" style={{ background: `${primaryColor}18`, color: primaryColor }}>
            {restaurant.logo_url ? (
              <Image src={restaurant.logo_url} alt="" width={34} height={34} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '11px' }} />
            ) : '🍽️'}
          </div>
        )}

        <div className="customer-app-bar-copy">
          <div className="customer-app-bar-kicker">{restaurant.name}</div>
          <div className="customer-app-bar-title">{title}</div>
          {subtitle && <div className="customer-app-bar-subtitle">{subtitle}</div>}
        </div>

        {right ?? (
          <div className="customer-table-pill">
            <span className="customer-table-dot" style={{ background: primaryColor }} />
            Open
            <ChevronDown size={13} />
          </div>
        )}
      </div>
    </header>
  )
}
