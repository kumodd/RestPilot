'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils/price'
import { DIETARY_LABELS } from '@/lib/types/app.types'
import CategoryFormModal from './CategoryFormModal'
import ItemFormModal from './ItemFormModal'
import MenuImportPanel from './MenuImportPanel'

interface VariantRow {
  id: string
  name: string
  options: unknown
  is_required: boolean
  sort_order: number
}

interface AddonRow {
  id: string
  name: string
  price: number
  is_active: boolean
  sort_order: number
}

interface MenuItemRow {
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
  category_id: string
  menu_item_variants: VariantRow[]
  menu_addons: AddonRow[]
}

interface CategoryRow {
  id: string
  name: string
  description: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  is_available: boolean
  menu_items: MenuItemRow[]
}

interface Props {
  categories: CategoryRow[]
  restaurantId: string
  canManageMenu: boolean
}

type ModalState =
  | { type: 'none' }
  | { type: 'add_category' }
  | { type: 'edit_category'; category: CategoryRow }
  | { type: 'add_item'; categoryId: string }
  | { type: 'edit_item'; item: MenuItemRow }

export default function MenuEditorClient({ categories: initial, restaurantId, canManageMenu }: Props) {
  const supabase = createClient()
  const [categories, setCategories] = useState<CategoryRow[]>(initial)
  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set([initial[0]?.id ?? '']))
  const [search, setSearch] = useState('')

  const refreshData = useCallback(async () => {
    const { data } = await supabase
      .from('menu_categories')
      .select(`
        id, name, description, image_url, sort_order, is_active, is_available,
        menu_items (
          id, name, description, image_url, base_price,
          is_popular, is_new, is_special, is_recommended,
          dietary_type, spice_level, preparation_time_minutes,
          is_active, is_available, sort_order, category_id,
          menu_item_variants (id, name, options, is_required, sort_order),
          menu_addons (id, name, price, is_active, sort_order)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: true })

    setCategories((data as unknown as CategoryRow[]) ?? [])
  }, [restaurantId, supabase])

  const toggleCategory = (catId: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const toggleItemAvailability = async (item: MenuItemRow) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('menu_items') as any)
      .update({ is_available: !item.is_available })
      .eq('id', item.id)
    await refreshData()
  }

  const toggleCategoryAvailability = async (cat: CategoryRow) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('menu_categories') as any)
      .update({ is_available: !cat.is_available })
      .eq('id', cat.id)
    await refreshData()
  }

  const deleteItem = async (itemId: string) => {
    if (!confirm('Delete this menu item? This cannot be undone.')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('menu_items') as any).delete().eq('id', itemId)
    await refreshData()
  }

  const deleteCategory = async (catId: string) => {
    if (!confirm('Delete this category and all its items? This cannot be undone.')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('menu_categories') as any).delete().eq('id', catId)
    await refreshData()
  }

  const filteredCategories = categories.map(cat => ({
    ...cat,
    menu_items: cat.menu_items.filter(item =>
      !search || item.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => !search || cat.menu_items.length > 0 || cat.name.toLowerCase().includes(search.toLowerCase()))

  const totalItems = categories.reduce((acc, c) => acc + c.menu_items.length, 0)
  const activeItems = categories.reduce((acc, c) => acc + c.menu_items.filter(i => i.is_available).length, 0)

  return (
    <main className="page-content" style={{ maxWidth: '1180px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ color: '#FF8C5A', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '8px' }}>Menu studio</div>
          <h1 className="page-title">Build a menu people want to order</h1>
          <p className="page-subtitle">
            Keep your digital menu accurate, attractive, and ready for QR ordering.
          </p>
        </div>
        {canManageMenu && <button className="btn btn-primary" onClick={() => setModal({ type: 'add_category' })}>+ Add category</button>}
      </div>

      <div className="stats-grid" style={{ marginBottom: '26px' }}>
        {[
          { label: 'Categories', value: categories.length, icon: '▦', color: '#A78BFA' },
          { label: 'Menu items', value: totalItems, icon: '✦', color: '#FF8C5A' },
          { label: 'Available now', value: activeItems, icon: '●', color: '#4ADE80' },
          { label: 'Needs attention', value: totalItems - activeItems, icon: '!', color: '#FCD34D' },
        ].map(stat => (
          <div key={stat.label} className="stat-card" style={{ '--stat-color': stat.color } as React.CSSProperties}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div><div className="stat-value">{stat.value}</div><div className="stat-label">{stat.label}</div></div>
              <span style={{ width: '38px', height: '38px', display: 'grid', placeItems: 'center', borderRadius: '12px', color: stat.color, background: `${stat.color}18`, fontWeight: 800 }}>{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {canManageMenu ? (
        <MenuImportPanel restaurantId={restaurantId} onApplied={refreshData} />
      ) : (
        <div style={{ marginBottom: '22px', padding: '13px 16px', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', color: '#A3A3A3', fontSize: '0.8rem' }}>
          👀 You’re viewing this menu in read-only mode. Ask the restaurant owner or manager to make changes.
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="🔍  Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '360px' }}
        />
      </div>

      {/* Categories */}
      {filteredCategories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🍽️</div>
          <h2 className="empty-state-title">
            {search ? 'No results found' : 'No Categories Yet'}
          </h2>
          <p className="empty-state-desc">
            {search ? 'Try a different search term.' : 'Add your first category to start building your menu.'}
          </p>
          {!search && (
            <button
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
              onClick={() => setModal({ type: 'add_category' })}
            >
              Add Category
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredCategories.map(cat => {
            const isExpanded = expandedCats.has(cat.id)
            return (
              <div
                key={cat.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  opacity: cat.is_available ? 1 : 0.6,
                }}
              >
                {/* Category Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}
                  onClick={() => toggleCategory(cat.id)}
                >
                  {/* Expand icon */}
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#737373',
                      transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      display: 'inline-block',
                      width: '16px',
                      flexShrink: 0,
                    }}
                  >
                    ▶
                  </span>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: '#F5F5F5' }}>
                        {cat.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: cat.is_available ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          color: cat.is_available ? '#22C55E' : '#EF4444',
                          border: `1px solid ${cat.is_available ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                        }}
                      >
                        {cat.is_available ? 'Active' : 'Hidden'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#737373' }}>
                        {cat.menu_items.length} items
                      </span>
                    </div>
                    {cat.description && (
                      <p style={{ fontSize: '0.78rem', color: '#737373', marginTop: '2px' }}>
                        {cat.description}
                      </p>
                    )}
                  </div>

                  {/* Category Actions */}
                  <div
                    style={{ display: 'flex', gap: '6px' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {canManageMenu && <button
                      onClick={() => setModal({ type: 'add_item', categoryId: cat.id })}
                      style={{
                        padding: '5px 12px',
                        background: 'rgba(255,107,53,0.12)',
                        border: '1px solid rgba(255,107,53,0.25)',
                        borderRadius: '8px',
                        color: '#FF6B35',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      + Item
                    </button>}
                    {canManageMenu && <button
                      onClick={() => toggleCategoryAvailability(cat)}
                      title={cat.is_available ? 'Hide category' : 'Show category'}
                      style={{
                        padding: '5px 10px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#A3A3A3',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {cat.is_available ? '👁' : '🚫'}
                    </button>}
                    {canManageMenu && <button
                      onClick={() => setModal({ type: 'edit_category', category: cat })}
                      style={{
                        padding: '5px 10px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#A3A3A3',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      ✏️
                    </button>}
                    {canManageMenu && <button
                      onClick={() => deleteCategory(cat.id)}
                      style={{
                        padding: '5px 10px',
                        background: 'rgba(239,68,68,0.06)',
                        border: '1px solid rgba(239,68,68,0.15)',
                        borderRadius: '8px',
                        color: '#EF4444',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      🗑
                    </button>}
                  </div>
                </div>

                {/* Items List */}
                {isExpanded && (
                  <div style={{ padding: '0 0 8px' }}>
                    {cat.menu_items.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center' }}>
                        <p style={{ color: '#525252', fontSize: '0.85rem', marginBottom: '12px' }}>
                          No items in this category yet
                        </p>
                        {canManageMenu && <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setModal({ type: 'add_item', categoryId: cat.id })}
                        >
                          + Add First Item
                        </button>}
                      </div>
                    ) : (
                      cat.menu_items
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map(item => {
                          const dietaryLabel = item.dietary_type
                            ? DIETARY_LABELS[item.dietary_type as keyof typeof DIETARY_LABELS]
                            : null

                          return (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                padding: '12px 20px',
                                borderTop: '1px solid rgba(255,255,255,0.04)',
                                transition: 'background 0.15s',
                                opacity: item.is_available ? 1 : 0.55,
                              }}
                            >
                              {/* Dietary dot */}
                              {dietaryLabel && (
                                <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>
                                  {dietaryLabel.icon}
                                </span>
                              )}

                              {/* Thumbnail */}
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                position: 'relative'
                              }}>
                                {item.image_url ? (
                                  <Image src={item.image_url} alt={item.name} width={48} height={48} unoptimized style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: '1.2rem', opacity: 0.5 }}>🍲</span>
                                )}
                              </div>

                              {/* Item info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#F5F5F5' }}>
                                    {item.name}
                                  </span>
                                  {item.is_popular && <span style={{ fontSize: '0.65rem', color: '#D97706', background: 'rgba(217,119,6,0.12)', padding: '1px 6px', borderRadius: '999px', fontWeight: 700 }}>🔥 Popular</span>}
                                  {item.is_new && <span style={{ fontSize: '0.65rem', color: '#059669', background: 'rgba(5,150,105,0.12)', padding: '1px 6px', borderRadius: '999px', fontWeight: 700 }}>✨ New</span>}
                                  {item.is_special && <span style={{ fontSize: '0.65rem', color: '#7C3AED', background: 'rgba(124,58,237,0.12)', padding: '1px 6px', borderRadius: '999px', fontWeight: 700 }}>⭐ Special</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '14px', fontSize: '0.78rem', color: '#737373' }}>
                                  <span style={{ fontWeight: 700, color: '#FF6B35', fontSize: '0.9rem' }}>
                                    {formatPrice(item.base_price)}
                                  </span>
                                  {item.menu_item_variants.length > 0 && (
                                    <span>{item.menu_item_variants.length} variant{item.menu_item_variants.length > 1 ? 's' : ''}</span>
                                  )}
                                  {item.menu_addons.length > 0 && (
                                    <span>{item.menu_addons.length} add-on{item.menu_addons.length > 1 ? 's' : ''}</span>
                                  )}
                                  {item.preparation_time_minutes && (
                                    <span>⏱ {item.preparation_time_minutes}m</span>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              {canManageMenu && <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                {/* Toggle available */}
                                <button
                                  onClick={() => toggleItemAvailability(item)}
                                  title={item.is_available ? 'Mark unavailable' : 'Mark available'}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    background: item.is_available ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
                                    color: item.is_available ? '#22C55E' : '#737373',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {item.is_available ? '✓' : '○'}
                                </button>
                                <button
                                  onClick={() => setModal({ type: 'edit_item', item })}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    background: 'rgba(255,255,255,0.04)',
                                    color: '#A3A3A3',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => deleteItem(item.id)}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(239,68,68,0.15)',
                                    background: 'rgba(239,68,68,0.06)',
                                    color: '#EF4444',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  🗑
                                </button>
                              </div>}
                            </div>
                          )
                        })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Category Form Modal */}
      {(modal.type === 'add_category' || modal.type === 'edit_category') && (
        <CategoryFormModal
          restaurantId={restaurantId}
          category={modal.type === 'edit_category' ? modal.category : undefined}
          onClose={() => setModal({ type: 'none' })}
          onSaved={async () => {
            setModal({ type: 'none' })
            await refreshData()
          }}
        />
      )}

      {/* Item Form Modal */}
      {(modal.type === 'add_item' || modal.type === 'edit_item') && (
        <ItemFormModal
          restaurantId={restaurantId}
          categoryId={modal.type === 'add_item' ? modal.categoryId : modal.item.category_id}
          categories={categories.map(c => ({ id: c.id, name: c.name }))}
          item={modal.type === 'edit_item' ? modal.item : undefined}
          onClose={() => setModal({ type: 'none' })}
          onSaved={async () => {
            setModal({ type: 'none' })
            await refreshData()
          }}
        />
      )}
    </main>
  )
}
