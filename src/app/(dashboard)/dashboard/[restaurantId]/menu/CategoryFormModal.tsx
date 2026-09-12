'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Category {
  id: string
  name: string
  description: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  is_available: boolean
}

interface Props {
  restaurantId: string
  category?: Category
  onClose: () => void
  onSaved: () => Promise<void>
}

export default function CategoryFormModal({ restaurantId, category, onClose, onSaved }: Props) {
  const supabase = createClient()
  const isEdit = !!category

  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? 0))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setIsLoading(true)
    setError(null)

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      sort_order: parseInt(sortOrder, 10) || 0,
      restaurant_id: restaurantId,
      is_active: true,
      is_available: true,
    }

    if (isEdit) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase.from('menu_categories') as any)
        .update({ name: payload.name, description: payload.description, sort_order: payload.sort_order })
        .eq('id', category.id)
      if (err) { setError(err.message); setIsLoading(false); return }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase.from('menu_categories') as any).insert(payload)
      if (err) { setError(err.message); setIsLoading(false); return }
    }

    await onSaved()
  }

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
          padding: '28px',
          width: '100%',
          maxWidth: '460px',
          zIndex: 1001,
          boxShadow: '0 16px 64px rgba(0,0,0,0.6)',
          animation: 'scaleIn 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F5F5F5', marginBottom: '24px' }}>
          {isEdit ? '✏️ Edit Category' : '+ New Category'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Category Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Starters, Mains, Desserts"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="Brief description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Sort Order</label>
            <input
              type="number"
              className="form-input"
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              min={0}
              style={{ maxWidth: '100px' }}
            />
            <span className="form-hint">Lower numbers appear first</span>
          </div>

          {error && (
            <div
              style={{
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

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
