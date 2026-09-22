'use client'

import { useState, useRef, useCallback, useDeferredValue, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils/price'
import { useCart } from '@/lib/hooks/useCart'
import { useCustomerStorage } from '@/lib/hooks/useCustomerStorage'
import type { QRResolution } from '@/lib/types/app.types'
import type { RestaurantSettings } from '@/lib/types/app.types'
import CartSheet from '@/components/customer/CartSheet'
import ItemCustomizer from '@/components/customer/ItemCustomizer'
import CustomerAppBar from '@/components/customer/CustomerAppBar'
import CustomerBottomNav from '@/components/customer/CustomerBottomNav'

interface MenuCategory {
  id: string
  name: string
  description: string | null
  image_url: string | null
  sort_order: number
  menu_items: MenuItem[]
}

interface MenuItem {
  id: string
  name: string
  description: string | null
  image_url: string | null
  base_price: number
  is_popular: boolean
  is_new: boolean
  is_special: boolean
  is_recommended: boolean
  dietary_type: string | null
  spice_level: string | null
  preparation_time_minutes: number | null
  is_active: boolean
  is_available: boolean
  sort_order: number
  menu_item_variants: Array<{
    id: string
    name: string
    options: unknown
    is_required: boolean
    sort_order: number
  }>
  menu_addons: Array<{
    id: string
    name: string
    price: number
    is_active: boolean
    sort_order: number
  }>
}

interface Props {
  resolution: QRResolution
  categories: MenuCategory[]
  settings: RestaurantSettings | null
  tableToken: string
}

export default function MenuPageClient({ resolution, categories, settings, tableToken }: Props) {
  const { restaurant, branch, table } = resolution
  const searchParams = useSearchParams()
  const existingOrderToken = searchParams.get('order')
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id ?? '')
  const [customizerItem, setCustomizerItem] = useState<MenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [dietaryFilter, setDietaryFilter] = useState('all')
  const [popularOnly, setPopularOnly] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const brandStyle = {
    '--restaurant-primary': restaurant.primary_color ?? '#FF6B35',
    '--restaurant-secondary': restaurant.secondary_color ?? '#1A1A2E',
  } as React.CSSProperties

  const cart = useCart({ tableToken, restaurantId: restaurant.id })
  const { customerData } = useCustomerStorage(restaurant.id)

  const scrollToCategory = useCallback((categoryId: string) => {
    setActiveCategory(categoryId)
    const el = sectionRefs.current[categoryId]
    if (el) {
      const navHeight = 112
      const top = el.getBoundingClientRect().top + window.scrollY - navHeight
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [])

  const filteredCategories = useMemo(() => {
    const normalizedSearch = deferredSearchQuery.trim().toLowerCase()
    return categories.map(cat => ({
      ...cat,
      menu_items: cat.menu_items.filter(item => {
        if (!item.is_available) return false
        if (dietaryFilter !== 'all' && item.dietary_type !== dietaryFilter) return false
        if (popularOnly && !item.is_popular && !item.is_recommended) return false
        if (!normalizedSearch) return true
        return (
          item.name.toLowerCase().includes(normalizedSearch) ||
          item.description?.toLowerCase().includes(normalizedSearch) ||
          cat.name.toLowerCase().includes(normalizedSearch)
        )
      }),
    })).filter(cat => cat.menu_items.length > 0)
  }, [categories, deferredSearchQuery, dietaryFilter, popularOnly])

  const spotlightItems = useMemo(() => categories
    .flatMap(category => category.menu_items)
    .filter(item => item.is_available && (item.is_popular || item.is_recommended))
    .slice(0, 6), [categories])

  const availableItemCount = useMemo(() => categories.reduce(
    (count, category) => count + category.menu_items.filter(item => item.is_available).length,
    0,
  ), [categories])

  const cartItemCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of cart.items) {
      counts.set(item.menuItemId, (counts.get(item.menuItemId) ?? 0) + item.quantity)
    }
    return counts
  }, [cart.items])

  const dietaryIcon = (type: string | null) => {
    if (type === 'veg' || type === 'vegan') return '🟢'
    if (type === 'non_veg') return '🔴'
    return null
  }

  return (
    <div style={brandStyle} className="theme-customer customer-app-page customer-menu-shell" id="menu-page">
      <CustomerAppBar
        restaurant={restaurant}
        title={table.display_name ?? `Table ${table.table_number}`}
        subtitle={branch.name}
        backHref={existingOrderToken ? `/order/${existingOrderToken}` : `/t/${tableToken}`}
        right={(
          <button
            type="button"
            className="customer-icon-button"
            onClick={() => setSearchOpen(value => !value)}
            aria-label="Search menu"
          >
            🔍
          </button>
        )}
      />

      {searchOpen && (
        <div style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid rgba(23,23,23,0.06)' }}>
          <input
            autoFocus
            type="search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search dishes, ingredients or categories…"
            aria-label="Search menu"
            style={{ width: '100%', maxWidth: '728px', display: 'block', margin: '0 auto', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(23,23,23,0.12)', background: '#F7F7F8', color: '#171717', outline: 'none' }}
          />
        </div>
      )}

      <div
        style={{
          position: 'sticky',
          top: searchOpen ? '116px' : '68px',
          zIndex: 40,
          display: 'flex',
          gap: '8px',
          padding: '10px 16px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          background: 'rgba(255,255,255,0.95)',
          borderBottom: '1px solid rgba(23,23,23,0.06)',
        }}
      >
        {categories.map(cat => (
          <button
            type="button"
            key={cat.id}
            onClick={() => scrollToCategory(cat.id)}
            style={{
              padding: '8px 15px',
              borderRadius: '999px',
              border: `1px solid ${activeCategory === cat.id ? restaurant.primary_color ?? '#FF6B35' : 'rgba(23,23,23,0.1)'}`,
              background: activeCategory === cat.id ? restaurant.primary_color ?? '#FF6B35' : '#fff',
              color: activeCategory === cat.id ? 'white' : '#525252',
              fontSize: '0.78rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu Content */}
      <main style={{ padding: '0 0 150px', background: '#F7F7F8' }}>
        <section className="customer-menu-intro" style={{ padding: '18px 16px 4px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <div>
              <p style={{ color: '#737373', fontSize: '0.76rem', marginBottom: '4px' }}>Ordering from</p>
              <h1 style={{ color: '#171717', fontSize: '1.15rem', fontWeight: 800 }}>
                {table.display_name ?? `Table ${table.table_number}`}
              </h1>
            </div>
            <span
              style={{
                color: restaurant.is_accepting_orders ? '#15803D' : '#B91C1C',
                background: restaurant.is_accepting_orders ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                border: `1px solid ${restaurant.is_accepting_orders ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)'}`,
                borderRadius: '999px',
                padding: '6px 10px',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}
            >
              {restaurant.is_accepting_orders ? '● Taking orders' : '● Orders paused'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
            <button
              type="button"
              onClick={() => setPopularOnly(value => !value)}
              style={{
                flexShrink: 0,
                padding: '8px 12px',
                borderRadius: '999px',
                border: `1px solid ${popularOnly ? restaurant.primary_color ?? '#FF6B35' : 'rgba(23,23,23,0.1)'}`,
                background: popularOnly ? `${restaurant.primary_color ?? '#FF6B35'}18` : '#FFFFFF',
                color: popularOnly ? '#262626' : '#525252',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🔥 Popular
            </button>
            {[
              ['all', 'All'],
              ['veg', '🟢 Veg'],
              ['vegan', '🌱 Vegan'],
              ['non_veg', '🔴 Non-veg'],
              ['jain', 'J Jain'],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => setDietaryFilter(value)}
                style={{
                  flexShrink: 0,
                  padding: '8px 12px',
                  borderRadius: '999px',
                  border: `1px solid ${dietaryFilter === value ? restaurant.primary_color ?? '#FF6B35' : 'rgba(23,23,23,0.1)'}`,
                  background: dietaryFilter === value ? `${restaurant.primary_color ?? '#FF6B35'}18` : '#FFFFFF',
                  color: dietaryFilter === value ? '#262626' : '#525252',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {spotlightItems.length > 0 && !deferredSearchQuery && dietaryFilter === 'all' && !popularOnly && (
          <section style={{ padding: '16px 16px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h2 style={{ color: '#262626', fontSize: '1rem', fontWeight: 800 }}>Popular picks</h2>
              <span style={{ color: '#737373', fontSize: '0.72rem' }}>{availableItemCount} items available</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
              {spotlightItems.map(item => (
                <button
                  type="button"
                  key={item.id}
                  className="customer-menu-card"
                  onClick={() => setCustomizerItem(item)}
                  style={{
                    minWidth: '150px',
                    maxWidth: '150px',
                    textAlign: 'left',
                    padding: 0,
                    border: '1px solid rgba(23,23,23,0.06)',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    background: '#FFFFFF',
                    color: '#171717',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ height: '86px', position: 'relative', background: '#F4F4F5' }}>
                    {item.image_url ? <Image src={item.image_url} alt="" fill sizes="150px" style={{ objectFit: 'cover' }} /> : <span style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: '2rem' }}>🍲</span>}
                  </div>
                  <div style={{ padding: '9px 10px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ color: restaurant.primary_color ?? '#FF6B35', fontWeight: 800, fontSize: '0.78rem', marginTop: '4px' }}>{formatPrice(item.base_price, restaurant.currency_symbol)}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {filteredCategories.map(category => (
          <div
            key={category.id}
            ref={el => { sectionRefs.current[category.id] = el }}
          >
            <div
              style={{
                padding: '20px 16px 8px',
                background: '#F7F7F8',
                position: 'sticky',
                top: searchOpen ? '172px' : '120px',
                zIndex: 20,
              }}
              className="customer-menu-category-heading"
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#262626' }}>
                {category.name}
              </h2>
              {category.description && (
                <p style={{ fontSize: '0.8rem', color: '#737373', marginTop: '2px' }}>
                  {category.description}
                </p>
              )}
            </div>

            <div style={{ padding: '0 16px' }}>
              {category.menu_items.map(item => {
                const inCart = cartItemCounts.get(item.id) ?? 0
                return (
                  <div
                    key={item.id}
                    className="customer-menu-item-card"
                    style={{
                      display: 'flex',
                      gap: '14px',
                      padding: '13px',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                    onClick={() => setCustomizerItem(item)}
                  >
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {dietaryIcon(item.dietary_type) && (
                          <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
                            {dietaryIcon(item.dietary_type)}
                          </span>
                        )}
                        {item.is_popular && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#D97706', background: 'rgba(217,119,6,0.15)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            🔥 Popular
                          </span>
                        )}
                        {item.is_new && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#059669', background: 'rgba(5,150,105,0.15)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ✨ New
                          </span>
                        )}
                        {item.is_special && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#7C3AED', background: 'rgba(124,58,237,0.15)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ⭐ Special
                          </span>
                        )}
                        {item.spice_level && item.spice_level !== 'none' && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#B91C1C', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                            🌶️ {item.spice_level.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      <h3 className="customer-menu-item-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#171717', marginBottom: '6px', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                        {item.name}
                      </h3>

                      {item.description && (
                        <p className="customer-menu-item-description" style={{ fontSize: '0.85rem', color: '#737373', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '12px' }}>
                          {item.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div className="customer-menu-item-price" style={{ fontWeight: 800, fontSize: '1rem', color: '#171717' }}>
                          {formatPrice(item.base_price, restaurant.currency_symbol)}
                        </div>
                        {item.preparation_time_minutes && (
                          <div style={{ fontSize: '0.75rem', color: '#737373', display: 'flex', alignItems: 'center', gap: '4px', background: '#F4F4F5', padding: '4px 8px', borderRadius: '6px' }}>
                            <span style={{ fontSize: '0.8rem' }}>⏱</span> {item.preparation_time_minutes} min
                          </div>
                        )}
                        {item.dietary_type && (
                          <div style={{ fontSize: '0.72rem', color: '#737373', textTransform: 'capitalize' }}>
                            {item.dietary_type.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Image + Add */}
                    <div style={{ position: 'relative', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '110px',
                        height: '110px',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                        background: 'linear-gradient(135deg, #FAFAFA 0%, #F4F4F5 100%)',
                        border: '1px solid rgba(23,23,23,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            sizes="110px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ fontSize: '2.5rem', opacity: 0.5, filter: 'grayscale(100%)' }}>🍲</span>
                        )}
                      </div>

                      {/* Add Button */}
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          if (item.menu_item_variants.length > 0 || item.menu_addons.length > 0) {
                            setCustomizerItem(item)
                          } else {
                            cart.addItem({
                              menuItemId: item.id,
                              name: item.name,
                              basePrice: item.base_price,
                              quantity: 1,
                              selectedVariants: [],
                              selectedAddons: [],
                              specialInstructions: '',
                            })
                          }
                        }}
                        style={{
                          position: 'absolute',
                          bottom: '-8px',
                          right: '-8px',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: restaurant.primary_color ?? '#FF6B35',
                          color: 'white',
                          border: '2.5px solid #FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: `0 4px 12px ${restaurant.primary_color ?? '#FF6B35'}60`,
                          zIndex: 2,
                        }}
                      >
                        {inCart > 0 ? inCart : '+'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 24px',
              textAlign: 'center',
              color: '#737373',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
            <p style={{ fontWeight: 600, color: '#737373' }}>No items found</p>
            <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
              Try a different search term
            </p>
          </div>
        )}
      </main>

      {/* Floating Cart Button */}
      {cart.totalItems > 0 && (
        <button
          className="cart-fab"
          onClick={() => setCartOpen(true)}
          aria-label="Open cart"
        >
          <div className="cart-fab-count">{cart.totalItems}</div>
          <span>View Cart</span>
          <span style={{ fontWeight: 700 }}>
            {formatPrice(cart.subtotal, restaurant.currency_symbol)}
          </span>
        </button>
      )}

      {/* Item Customizer Bottom Sheet */}
      {customizerItem && (
        <ItemCustomizer
          item={customizerItem}
          restaurant={restaurant}
          onClose={() => setCustomizerItem(null)}
          onAddToCart={cartItem => {
            cart.addItem(cartItem)
            setCustomizerItem(null)
          }}
        />
      )}

      {/* Cart Sheet */}
      {cartOpen && (
        <CartSheet
          cart={cart}
          restaurant={restaurant}
          table={table}
          settings={settings}
          customerData={customerData}
          tableToken={tableToken}
          existingOrderToken={existingOrderToken}
          onClose={() => setCartOpen(false)}
        />
      )}

      <CustomerBottomNav
        tableToken={tableToken}
        active={cartOpen ? 'cart' : 'menu'}
        cartCount={cart.totalItems}
        orderToken={existingOrderToken}
        onCart={() => setCartOpen(true)}
      />
    </div>
  )
}
