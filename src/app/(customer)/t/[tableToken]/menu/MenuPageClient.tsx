'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils/price'
import { useCart } from '@/lib/hooks/useCart'
import { useCustomerStorage } from '@/lib/hooks/useCustomerStorage'
import type { QRResolution } from '@/lib/types/app.types'
import type { RestaurantSettings } from '@/lib/types/app.types'
import CartSheet from '@/components/customer/CartSheet'
import ItemCustomizer from '@/components/customer/ItemCustomizer'

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
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id ?? '')
  const [customizerItem, setCustomizerItem] = useState<MenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

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

  const filteredCategories = categories.map(cat => ({
    ...cat,
    menu_items: cat.menu_items.filter(item => {
      if (!searchQuery) return item.is_available
      return (
        item.is_available &&
        (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }),
  })).filter(cat => cat.menu_items.length > 0)

  const dietaryIcon = (type: string | null) => {
    if (type === 'veg' || type === 'vegan') return '🟢'
    if (type === 'non_veg') return '🔴'
    return null
  }

  return (
    <div style={brandStyle} className="theme-customer" id="menu-page">
      {/* Sticky Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: restaurant.primary_color
            ? `linear-gradient(135deg, ${restaurant.secondary_color ?? '#1A1A2E'} 0%, ${restaurant.secondary_color ?? '#1A1A2E'}F0 100%)`
            : 'rgba(26,26,46,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            padding: '12px 16px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {restaurant.logo_url ? (
            <Image
              src={restaurant.logo_url}
              alt={restaurant.name}
              width={36}
              height={36}
              style={{ borderRadius: '8px', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: restaurant.primary_color ?? '#FF6B35',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
              }}
            >
              🍽️
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F5F5F5' }}>
              {restaurant.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
              {table.display_name ?? `Table ${table.table_number}`} · {branch.name}
            </div>
          </div>
          {/* Search */}
          <button
            onClick={() => {}}
            style={{
              padding: '7px 12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '999px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            🔍
          </button>
        </div>

        {/* Category Nav */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 16px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              style={{
                padding: '6px 16px',
                borderRadius: '999px',
                border: '1.5px solid',
                borderColor: activeCategory === cat.id
                  ? (restaurant.primary_color ?? '#FF6B35')
                  : 'rgba(255,255,255,0.15)',
                background: activeCategory === cat.id
                  ? (restaurant.primary_color ?? '#FF6B35')
                  : 'transparent',
                color: activeCategory === cat.id ? 'white' : 'rgba(255,255,255,0.6)',
                fontSize: '0.82rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Menu Content */}
      <main style={{ padding: '0 0 120px', background: '#0F0F1A' }}>
        {filteredCategories.map(category => (
          <div
            key={category.id}
            ref={el => { sectionRefs.current[category.id] = el }}
          >
            <div
              style={{
                padding: '20px 16px 8px',
                background: '#0F0F1A',
                position: 'sticky',
                top: '108px',
                zIndex: 20,
              }}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F5F5F5' }}>
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
                const inCart = cart.getItemCount(item.id)
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      gap: '14px',
                      padding: '16px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
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
                      </div>

                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                        {item.name}
                      </h3>

                      {item.description && (
                        <p style={{ fontSize: '0.85rem', color: '#A3A3A3', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '12px' }}>
                          {item.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#FFFFFF' }}>
                          {formatPrice(item.base_price, restaurant.currency_symbol)}
                        </div>
                        {item.preparation_time_minutes && (
                          <div style={{ fontSize: '0.75rem', color: '#737373', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px' }}>
                            <span style={{ fontSize: '0.8rem' }}>⏱</span> {item.preparation_time_minutes} min
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
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
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
                          border: '2.5px solid #0F0F1A',
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
            <p style={{ fontWeight: 600, color: '#A3A3A3' }}>No items found</p>
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
          onClose={() => setCartOpen(false)}
        />
      )}
    </div>
  )
}
