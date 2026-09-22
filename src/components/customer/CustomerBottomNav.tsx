'use client'

import Link from 'next/link'
import { ClipboardList, Home, Search, ShoppingBag } from 'lucide-react'

interface Props {
  tableToken: string
  active: 'home' | 'menu' | 'orders' | 'cart'
  cartCount?: number
  orderToken?: string | null
  onCart?: () => void
  cartHref?: string
}

export default function CustomerBottomNav({ tableToken, active, cartCount = 0, orderToken, onCart, cartHref }: Props) {
  const menuHref = orderToken
    ? `/t/${tableToken}/menu?order=${encodeURIComponent(orderToken)}`
    : `/t/${tableToken}/menu`
  const homeHref = orderToken
    ? `/t/${tableToken}?order=${encodeURIComponent(orderToken)}`
    : `/t/${tableToken}`
  const ordersHref = orderToken ? `/order/${orderToken}` : null
  const items = [
    { key: 'home' as const, label: 'Home', href: homeHref, icon: Home },
    { key: 'menu' as const, label: 'Menu', href: menuHref, icon: Search },
    { key: 'orders' as const, label: 'Orders', href: ordersHref, icon: ClipboardList },
  ]

  return (
    <nav className="customer-bottom-nav" aria-label="Customer navigation">
      <div className="customer-bottom-nav-inner">
        {items.map(item => {
          const Icon = item.icon
          const className = `customer-bottom-nav-item ${active === item.key ? 'is-active' : ''} ${!item.href ? 'is-disabled' : ''}`
          if (!item.href) {
            return (
              <span key={item.key} className={className} aria-disabled="true" title="Place an order to see it here">
                <Icon size={19} strokeWidth={2} />
                <span>{item.label}</span>
              </span>
            )
          }
          return (
            <Link key={item.key} href={item.href} className={className} aria-current={active === item.key ? 'page' : undefined}>
              <Icon size={19} strokeWidth={active === item.key ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          )
        })}
        {onCart ? (
          <button type="button" className={`customer-bottom-nav-item customer-bottom-cart ${active === 'cart' ? 'is-active' : ''} ${cartCount > 0 ? 'has-items' : ''}`} onClick={onCart} aria-label="Open cart" aria-pressed={active === 'cart'}>
            <ShoppingBag size={19} strokeWidth={2.2} />
            <span>Cart</span>
            {cartCount > 0 && <b>{cartCount}</b>}
          </button>
        ) : (
          <Link href={cartHref ?? menuHref} className={`customer-bottom-nav-item customer-bottom-cart ${active === 'cart' ? 'is-active' : ''}`} aria-label="Open cart">
            <ShoppingBag size={19} strokeWidth={2.2} />
            <span>Cart</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
