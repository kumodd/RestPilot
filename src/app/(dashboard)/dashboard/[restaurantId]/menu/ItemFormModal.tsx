'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DIETARY_LABELS, SPICE_LABELS } from '@/lib/types/app.types'

interface VariantOption {
  name: string
  price_delta: number
}

interface VariantDraft {
  id?: string
  name: string
  options: VariantOption[]
  is_required: boolean
}

interface AddonDraft {
  id?: string
  name: string
  price: number
  is_active: boolean
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
  menu_item_variants: Array<{ id: string; name: string; options: unknown; is_required: boolean; sort_order: number }>
  menu_addons: Array<{ id: string; name: string; price: number; is_active: boolean; sort_order: number }>
}

interface Props {
  restaurantId: string
  categoryId: string
  categories: Array<{ id: string; name: string }>
  item?: MenuItemRow
  onClose: () => void
  onSaved: () => Promise<void>
}

type TabId = 'basic' | 'labels' | 'variants' | 'addons'

export default function ItemFormModal({ restaurantId, categoryId, categories, item, onClose, onSaved }: Props) {
  const supabase = createClient()
  const isEdit = !!item

  // Basic fields
  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [price, setPrice] = useState(String(item?.base_price ?? ''))
  const [catId, setCatId] = useState(item?.category_id ?? categoryId)
  const [sortOrder, setSortOrder] = useState(String(item?.sort_order ?? 0))
  const [prepTime, setPrepTime] = useState(String(item?.preparation_time_minutes ?? ''))
  const [dietaryType, setDietaryType] = useState(item?.dietary_type ?? '')
  const [spiceLevel, setSpiceLevel] = useState(item?.spice_level ?? '')

  // Labels
  const [isPopular, setIsPopular] = useState(item?.is_popular ?? false)
  const [isNew, setIsNew] = useState(item?.is_new ?? false)
  const [isSpecial, setIsSpecial] = useState(item?.is_special ?? false)
  const [isRecommended, setIsRecommended] = useState(item?.is_recommended ?? false)

  // Variants
  const [variants, setVariants] = useState<VariantDraft[]>(
    item?.menu_item_variants.map(v => ({
      id: v.id,
      name: v.name,
      options: v.options as VariantOption[],
      is_required: v.is_required,
    })) ?? []
  )

  // Add-ons
  const [addons, setAddons] = useState<AddonDraft[]>(
    item?.menu_addons.map(a => ({
      id: a.id,
      name: a.name,
      price: a.price,
      is_active: a.is_active,
    })) ?? []
  )

  const [activeTab, setActiveTab] = useState<TabId>('basic')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Variant helpers ───────────────────────────────────────
  const addVariant = () => {
    setVariants(prev => [...prev, {
      name: '',
      options: [{ name: '', price_delta: 0 }],
      is_required: false,
    }])
  }

  const updateVariant = (idx: number, field: keyof VariantDraft, value: unknown) => {
    setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v))
  }

  const addOption = (variantIdx: number) => {
    setVariants(prev => prev.map((v, i) => i === variantIdx
      ? { ...v, options: [...v.options, { name: '', price_delta: 0 }] }
      : v
    ))
  }

  const updateOption = (variantIdx: number, optIdx: number, field: keyof VariantOption, value: unknown) => {
    setVariants(prev => prev.map((v, i) => i !== variantIdx ? v : {
      ...v,
      options: v.options.map((o, j) => j !== optIdx ? o : { ...o, [field]: value }),
    }))
  }

  const removeOption = (variantIdx: number, optIdx: number) => {
    setVariants(prev => prev.map((v, i) => i !== variantIdx ? v : {
      ...v,
      options: v.options.filter((_, j) => j !== optIdx),
    }))
  }

  const removeVariant = (idx: number) => {
    setVariants(prev => prev.filter((_, i) => i !== idx))
  }

  // ─── Addon helpers ─────────────────────────────────────────
  const addAddon = () => {
    setAddons(prev => [...prev, { name: '', price: 0, is_active: true }])
  }

  const updateAddon = (idx: number, field: keyof AddonDraft, value: unknown) => {
    setAddons(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a))
  }

  const removeAddon = (idx: number) => {
    setAddons(prev => prev.filter((_, i) => i !== idx))
  }

  // ─── Save ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim() || !price) return
    setIsLoading(true)
    setError(null)

    const itemPayload = {
      name: name.trim(),
      description: description.trim() || null,
      base_price: parseFloat(price),
      category_id: catId,
      restaurant_id: restaurantId,
      sort_order: parseInt(sortOrder, 10) || 0,
      preparation_time_minutes: prepTime ? parseInt(prepTime, 10) : null,
      dietary_type: dietaryType || null,
      spice_level: spiceLevel || null,
      is_popular: isPopular,
      is_new: isNew,
      is_special: isSpecial,
      is_recommended: isRecommended,
      is_active: true,
      is_available: true,
    }

    let itemId = item?.id

    if (isEdit && itemId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase.from('menu_items') as any)
        .update(itemPayload)
        .eq('id', itemId)
      if (err) { setError(err.message); setIsLoading(false); return }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase.from('menu_items') as any)
        .insert(itemPayload)
        .select('id')
        .single()
      if (err) { setError(err.message); setIsLoading(false); return }
      itemId = (data as { id: string }).id
    }

    if (!itemId) return

    // Save variants — delete old, insert new
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('menu_item_variants') as any).delete().eq('menu_item_id', itemId)
    if (variants.length > 0) {
      const validVariants = variants
        .filter(v => v.name.trim() && v.options.length > 0)
        .map((v, idx) => ({
          menu_item_id: itemId,
          name: v.name,
          options: v.options.filter(o => o.name.trim()),
          is_required: v.is_required,
          sort_order: idx,
        }))
      if (validVariants.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: vErr } = await (supabase.from('menu_item_variants') as any).insert(validVariants)
        if (vErr) { setError(vErr.message); setIsLoading(false); return }
      }
    }

    // Save add-ons — delete old, insert new
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('menu_addons') as any).delete().eq('menu_item_id', itemId)
    if (addons.length > 0) {
      const validAddons = addons
        .filter(a => a.name.trim())
        .map((a, idx) => ({
          menu_item_id: itemId,
          restaurant_id: restaurantId,
          name: a.name,
          price: a.price,
          is_active: a.is_active,
          sort_order: idx,
        }))
      if (validAddons.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('menu_addons') as any).insert(validAddons)
      }
    }

    await onSaved()
  }

  const TABS: Array<{ id: TabId; label: string }> = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'labels', label: 'Labels & Type' },
    { id: 'variants', label: `Variants (${variants.length})` },
    { id: 'addons', label: `Add-ons (${addons.length})` },
  ]

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#1A1A2E',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 1001,
          boxShadow: '0 16px 64px rgba(0,0,0,0.6)',
          animation: 'scaleIn 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F5F5F5', marginBottom: '16px' }}>
            {isEdit ? '✏️ Edit Item' : '+ New Menu Item'}
          </h2>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '2px', marginBottom: '-1px' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px 10px 0 0',
                  border: '1px solid',
                  borderBottom: 'none',
                  borderColor: activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                  background: activeTab === tab.id ? 'rgba(255,107,53,0.08)' : 'transparent',
                  color: activeTab === tab.id ? '#FF6B35' : '#737373',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '20px 24px' }}>
          {/* ── BASIC INFO ── */}
          {activeTab === 'basic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Butter Chicken"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Describe the dish..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Base Price (₹) *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0.00"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    min={0}
                    step={0.50}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Prep Time (mins)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="15"
                    value={prepTime}
                    onChange={e => setPrepTime(e.target.value)}
                    min={1}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={catId}
                    onChange={e => setCatId(e.target.value)}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ width: '80px' }}>
                  <label className="form-label">Order</label>
                  <input
                    type="number"
                    className="form-input"
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value)}
                    min={0}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── LABELS & TYPE ── */}
          {activeTab === 'labels' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Dietary Type */}
              <div className="form-group">
                <label className="form-label">Dietary Type</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                  {(['', ...Object.keys(DIETARY_LABELS)] as string[]).map(key => {
                    const label = key ? DIETARY_LABELS[key as keyof typeof DIETARY_LABELS] : null
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDietaryType(key)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '999px',
                          border: '1.5px solid',
                          borderColor: dietaryType === key ? '#FF6B35' : 'rgba(255,255,255,0.1)',
                          background: dietaryType === key ? 'rgba(255,107,53,0.12)' : 'transparent',
                          color: dietaryType === key ? '#FF6B35' : '#A3A3A3',
                          fontSize: '0.8rem',
                          fontWeight: dietaryType === key ? 700 : 400,
                          cursor: 'pointer',
                        }}
                      >
                        {label ? `${label.icon} ${label.label}` : 'None'}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Spice Level */}
              <div className="form-group">
                <label className="form-label">Spice Level</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                  {(['', ...Object.keys(SPICE_LABELS)] as string[]).map(key => {
                    const label = key ? SPICE_LABELS[key as keyof typeof SPICE_LABELS] : null
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSpiceLevel(key)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '999px',
                          border: '1.5px solid',
                          borderColor: spiceLevel === key ? '#FF6B35' : 'rgba(255,255,255,0.1)',
                          background: spiceLevel === key ? 'rgba(255,107,53,0.12)' : 'transparent',
                          color: spiceLevel === key ? '#FF6B35' : '#A3A3A3',
                          fontSize: '0.8rem',
                          fontWeight: spiceLevel === key ? 700 : 400,
                          cursor: 'pointer',
                        }}
                      >
                        {label ? `${label.icon || ''} ${label.label}`.trim() : 'Not Specified'}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Feature Labels */}
              <div className="form-group">
                <label className="form-label">Feature Labels</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  {[
                    { label: '🔥 Mark as Popular', value: isPopular, set: setIsPopular },
                    { label: '✨ Mark as New', value: isNew, set: setIsNew },
                    { label: '⭐ Mark as Special', value: isSpecial, set: setIsSpecial },
                    { label: '👍 Recommended by Chef', value: isRecommended, set: setIsRecommended },
                  ].map(toggle => (
                    <label
                      key={toggle.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: toggle.value ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${toggle.value ? 'rgba(255,107,53,0.25)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={toggle.value}
                        onChange={e => toggle.set(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#FF6B35' }}
                      />
                      <span style={{ fontSize: '0.88rem', fontWeight: 500, color: toggle.value ? '#F5F5F5' : '#A3A3A3' }}>
                        {toggle.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── VARIANTS ── */}
          {activeTab === 'variants' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.82rem', color: '#737373' }}>
                Variants let customers choose size, temperature, etc. Each variant has options with optional price adjustments.
              </p>

              {variants.map((variant, vIdx) => (
                <div
                  key={vIdx}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '14px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Variant name (e.g. Size)"
                      value={variant.name}
                      onChange={e => updateVariant(vIdx, 'name', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#A3A3A3', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={variant.is_required}
                        onChange={e => updateVariant(vIdx, 'is_required', e.target.checked)}
                        style={{ accentColor: '#FF6B35' }}
                      />
                      Required
                    </label>
                    <button
                      onClick={() => removeVariant(vIdx)}
                      style={{ width: '32px', height: '36px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                    {variant.options.map((opt, oIdx) => (
                      <div key={oIdx} style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Option name (e.g. Large)"
                          value={opt.name}
                          onChange={e => updateOption(vIdx, oIdx, 'name', e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.8rem', color: '#737373' }}>+₹</span>
                          <input
                            type="number"
                            className="form-input"
                            value={opt.price_delta}
                            onChange={e => updateOption(vIdx, oIdx, 'price_delta', parseFloat(e.target.value) || 0)}
                            style={{ width: '80px' }}
                            step={0.5}
                          />
                        </div>
                        {variant.options.length > 1 && (
                          <button
                            onClick={() => removeOption(vIdx, oIdx)}
                            style={{ width: '32px', height: '36px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#525252', cursor: 'pointer', fontSize: '1rem' }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addOption(vIdx)}
                    style={{
                      fontSize: '0.78rem',
                      color: '#FF6B35',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600,
                    }}
                  >
                    + Add Option
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addVariant}
                className="btn btn-secondary"
                style={{ alignSelf: 'flex-start' }}
              >
                + Add Variant Group
              </button>
            </div>
          )}

          {/* ── ADD-ONS ── */}
          {activeTab === 'addons' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.82rem', color: '#737373' }}>
                Add-ons are optional extras customers can add to their order (extra cheese, sauces, sides, etc.)
              </p>

              {addons.map((addon, idx) => (
                <div
                  key={idx}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add-on name"
                    value={addon.name}
                    onChange={e => updateAddon(idx, 'name', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#737373' }}>₹</span>
                    <input
                      type="number"
                      className="form-input"
                      value={addon.price}
                      onChange={e => updateAddon(idx, 'price', parseFloat(e.target.value) || 0)}
                      style={{ width: '80px' }}
                      min={0}
                      step={0.5}
                    />
                  </div>
                  <button
                    onClick={() => removeAddon(idx)}
                    style={{ width: '32px', height: '36px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addAddon}
                className="btn btn-secondary"
                style={{ alignSelf: 'flex-start' }}
              >
                + Add Add-on
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '8px',
                color: '#FCA5A5',
                fontSize: '0.82rem',
              }}
            >
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            gap: '10px',
          }}
        >
          <button className="btn btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary flex-1"
            onClick={handleSave}
            disabled={isLoading || !name.trim() || !price}
          >
            {isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </>
  )
}
