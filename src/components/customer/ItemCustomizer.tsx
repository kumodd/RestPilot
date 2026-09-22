'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils/price'
import type { CartItem } from '@/lib/types/app.types'

interface Variant {
  id: string
  name: string
  options: unknown
  is_required: boolean
  sort_order: number
}

interface Addon {
  id: string
  name: string
  price: number
  is_active: boolean
  sort_order: number
}

interface Item {
  id: string
  name: string
  description: string | null
  image_url: string | null
  base_price: number
  menu_item_variants: Variant[]
  menu_addons: Addon[]
}

interface VariantOption {
  name: string
  price_delta: number
}

interface Props {
  item: Item
  restaurant: { primary_color: string | null; currency_symbol: string }
  onClose: () => void
  onAddToCart: (item: Omit<CartItem, 'lineTotal' | 'cartItemId'>) => void
}

export default function ItemCustomizer({ item, restaurant, onClose, onAddToCart }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [selectedVariants, setSelectedVariants] = useState<
    Array<{
      variantId: string
      variantName: string
      optionName: string
      priceDelta: number
    }>
  >([])
  const [selectedAddons, setSelectedAddons] = useState<
    Array<{ addonId: string; name: string; price: number }>
  >([])
  const [instructions, setInstructions] = useState('')

  const primaryColor = restaurant.primary_color ?? '#FF6B35'

  const selectVariantOption = (variant: Variant, option: VariantOption) => {
    setSelectedVariants(prev => {
      const filtered = prev.filter(v => v.variantId !== variant.id)
      return [
        ...filtered,
        {
          variantId: variant.id,
          variantName: variant.name,
          optionName: option.name,
          priceDelta: option.price_delta,
        },
      ]
    })
  }

  const toggleAddon = (addon: Addon) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.addonId === addon.id)
      if (exists) return prev.filter(a => a.addonId !== addon.id)
      return [...prev, { addonId: addon.id, name: addon.name, price: addon.price }]
    })
  }

  const variantTotal = selectedVariants.reduce((acc, v) => acc + v.priceDelta, 0)
  const addonTotal = selectedAddons.reduce((acc, a) => acc + a.price, 0)
  const unitPrice = item.base_price + variantTotal + addonTotal
  const totalPrice = unitPrice * quantity

  const handleAdd = () => {
    // Validate required variants
    const missingRequired = item.menu_item_variants
      .filter(v => v.is_required)
      .filter(v => !selectedVariants.find(sv => sv.variantId === v.id))

    if (missingRequired.length > 0) {
      alert(`Please select: ${missingRequired.map(v => v.name).join(', ')}`)
      return
    }

    onAddToCart({
      menuItemId: item.id,
      name: item.name,
      basePrice: item.base_price,
      quantity,
      selectedVariants,
      selectedAddons,
      specialInstructions: instructions,
    })
  }

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
        }}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className="customer-item-customizer"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#1A1A2E',
          borderRadius: '24px 24px 0 0',
          zIndex: 1001,
          maxHeight: '92vh',
          overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom)',
          animation: 'slideUp 0.3s ease',
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: '36px',
            height: '4px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '999px',
            margin: '12px auto',
          }}
        />

        {/* Item Image */}
        {item.image_url ? (
          <div style={{ position: 'relative', height: '240px', overflow: 'hidden', width: '100%', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}>
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              style={{ objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, rgba(26,26,46,0) 40%, rgba(26,26,46,0.8) 80%, #1A1A2E 100%)',
              }}
            />
          </div>
        ) : (
          <div style={{ padding: '24px 0 0' }} />
        )}

        <div style={{ padding: '20px 20px 0' }}>
          {/* Item Name & Description */}
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#F5F5F5', marginBottom: '8px' }}>
            {item.name}
          </h2>
          {item.description && (
            <p style={{ fontSize: '0.875rem', color: '#737373', lineHeight: 1.5, marginBottom: '16px' }}>
              {item.description}
            </p>
          )}

          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#F5F5F5', marginBottom: '24px' }}>
            {formatPrice(item.base_price, restaurant.currency_symbol)}
          </div>
        </div>

        {/* Variants */}
        {item.menu_item_variants.map(variant => {
          const options = variant.options as VariantOption[]
          const selected = selectedVariants.find(sv => sv.variantId === variant.id)
          return (
            <div key={variant.id} style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#A3A3A3',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {variant.name}
                {variant.is_required && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      background: 'rgba(239,68,68,0.15)',
                      color: '#FCA5A5',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Required
                  </span>
                )}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {options.map(option => {
                  const isSelected = selected?.optionName === option.name
                  return (
                    <button
                      key={option.name}
                      onClick={() => selectVariantOption(variant, option)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: isSelected ? `${primaryColor}18` : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${isSelected ? primaryColor : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? primaryColor : 'rgba(255,255,255,0.2)'}`,
                            background: isSelected ? primaryColor : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && (
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'white' }} />
                          )}
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: isSelected ? '#F5F5F5' : '#A3A3A3' }}>
                          {option.name}
                        </span>
                      </div>
                      {option.price_delta !== 0 && (
                        <span style={{ fontSize: '0.85rem', color: isSelected ? primaryColor : '#737373', fontWeight: 600 }}>
                          {option.price_delta > 0 ? '+' : ''}
                          {formatPrice(option.price_delta, restaurant.currency_symbol)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Add-ons */}
        {item.menu_addons.filter(a => a.is_active).length > 0 && (
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#A3A3A3',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '12px',
              }}
            >
              Add-ons
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {item.menu_addons.filter(a => a.is_active).map(addon => {
                const isSelected = !!selectedAddons.find(a => a.addonId === addon.id)
                return (
                  <button
                    key={addon.id}
                    onClick={() => toggleAddon(addon)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: isSelected ? `${primaryColor}18` : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${isSelected ? primaryColor : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: `2px solid ${isSelected ? primaryColor : 'rgba(255,255,255,0.2)'}`,
                          background: isSelected ? primaryColor : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && '✓'}
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: isSelected ? '#F5F5F5' : '#A3A3A3' }}>
                        {addon.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: isSelected ? primaryColor : '#737373', fontWeight: 600 }}>
                      +{formatPrice(addon.price, restaurant.currency_symbol)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Special Instructions */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#A3A3A3',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '12px',
            }}
          >
            Special Instructions
          </h3>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="E.g. Less spicy, no onions..."
            maxLength={200}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              color: '#F5F5F5',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              resize: 'none',
              minHeight: '72px',
              outline: 'none',
            }}
          />
        </div>

        {/* Quantity + Add to Cart */}
        <div
          style={{
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Quantity */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1.5px solid rgba(255,255,255,0.12)',
              borderRadius: '999px',
              padding: '4px',
            }}
          >
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: quantity > 1 ? `${primaryColor}20` : 'transparent',
                border: 'none',
                color: quantity > 1 ? primaryColor : '#525252',
                fontSize: '1.2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              −
            </button>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#F5F5F5', minWidth: '20px', textAlign: 'center' }}>
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(q => q + 1)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: `${primaryColor}20`,
                border: 'none',
                color: primaryColor,
                fontSize: '1.2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              +
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            style={{
              flex: 1,
              padding: '14px',
              background: primaryColor,
              color: 'white',
              border: 'none',
              borderRadius: '14px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: `0 8px 24px ${primaryColor}50`,
            }}
          >
            <span>Add to Cart</span>
            <span>{formatPrice(totalPrice, restaurant.currency_symbol)}</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
