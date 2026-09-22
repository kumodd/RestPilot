'use client'

import Link from 'next/link'
import { ClipboardList, Home, Search, ShoppingBag } from 'lucide-react'

interface Props {
  tableToken: string
  active: 'home' | 'menu' | 'orders'
  cartCount?: number
  orderToken?: string | null
  onCart?: () => void
  cartHref?: string
}

export default function CustomerBottomNav({ tableToken, active, cartCount = 0, orderToken, onCart, cartHref }: Props) {
  const items = [
    { key: 'home' as const, label: 'Home', href: `/t/${tableToken}`, icon: Home },
    { key: 'menu' as const, label: 'Menu', href: `/t/${tableToken}/menu`, icon: Search },
    { key: 'orders' as const, label: 'Orders', href: orderToken ? `/order/${orderToken}` : `/t/${tableToken}`, icon: ClipboardList },
  ]

  return (
    <nav className="customer-bottom-nav" aria-label="Customer navigation">
      <div className="customer-bottom-nav-inner">
        {items.map(item => {
          const Icon = item.icon
          return (
            <Link key={item.key} href={item.href} className={`customer-bottom-nav-item ${active === item.key ? 'is-active' : ''}`}>
              <Icon size={19} strokeWidth={active === item.key ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          )
        })}
        {onCart ? (
          <button type="button" className={`customer-bottom-nav-item customer-bottom-cart ${cartCount > 0 ? 'has-items' : ''}`} onClick={onCart} aria-label="Open cart">
            <ShoppingBag size={19} strokeWidth={2.2} />
            <span>Cart</span>
            {cartCount > 0 && <b>{cartCount}</b>}
          </button>
        ) : (
          <Link href={cartHref ?? `/t/${tableToken}/menu`} className="customer-bottom-nav-item customer-bottom-cart" aria-label="Open cart">
            <ShoppingBag size={19} strokeWidth={2.2} />
            <span>Cart</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
