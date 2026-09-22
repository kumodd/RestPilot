'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { applyMenuImport, extractMenuFromPhoto } from '@/app/actions/menu-import'
import type { MenuImportDraft, MenuImportItem } from '@/lib/types/menu-import'

interface Props {
  restaurantId: string
  onApplied: () => Promise<void>
}

function updateItem(draft: MenuImportDraft, categoryIndex: number, itemIndex: number, patch: Partial<MenuImportItem>) {
  return {
    ...draft,
    categories: draft.categories.map((category, index) => index !== categoryIndex
      ? category
      : { ...category, items: category.items.map((item, itemPosition) => itemPosition === itemIndex ? { ...item, ...patch } : item) }),
  }
}

export default function MenuImportPanel({ restaurantId, onApplied }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [draft, setDraft] = useState<MenuImportDraft | null>(null)
  const [importId, setImportId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const chooseFile = (nextFile: File | undefined) => {
    if (!nextFile) return
    setError(null)
    setDraft(null)
    setImportId(null)
    setFile(nextFile)
    setPreviewUrl(URL.createObjectURL(nextFile))
  }

  const extract = async () => {
    if (!file) return
    setIsExtracting(true)
    setError(null)
    const formData = new FormData()
    formData.set('restaurantId', restaurantId)
    formData.set('file', file)
    try {
      const result = await extractMenuFromPhoto(formData)
      setDraft(result.draft)
      setImportId(result.importId)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Menu extraction failed')
    } finally {
      setIsExtracting(false)
    }
  }

  const apply = async () => {
    if (!draft || !importId) return
    setIsApplying(true)
    setError(null)
    try {
      await applyMenuImport({ restaurantId, importId, draft })
      await onApplied()
      setDraft(null)
      setImportId(null)
      setFile(null)
      setPreviewUrl(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save imported menu')
    } finally {
      setIsApplying(false)
    }
  }

  const reset = () => {
    setFile(null)
    setDraft(null)
    setImportId(null)
    setPreviewUrl(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const itemCount = draft?.categories.reduce((total, category) => total + category.items.length, 0) ?? 0

  return (
    <section className="card" style={{
      marginBottom: '26px',
      padding: 0,
      overflow: 'hidden',
      border: '1px solid rgba(255,107,53,0.26)',
      background: 'linear-gradient(135deg, rgba(255,107,53,0.12), rgba(139,92,246,0.10) 48%, rgba(255,255,255,0.035))',
    }}>
      <div style={{ padding: '24px 26px 18px', display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#FF8C5A', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
            AI menu studio
          </div>
          <h2 style={{ color: '#F5F5F5', fontSize: '1.2rem', marginBottom: '7px' }}>Turn a menu photo into your digital menu</h2>
          <p style={{ color: '#B7B7C7', fontSize: '0.84rem', maxWidth: '620px', lineHeight: 1.55 }}>
            Upload a clear photo. RestPilot reads the categories, dishes, prices, variants, and add-ons, then lets you review everything before it goes live.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: '#C4B5FD', background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(196,181,253,0.2)', borderRadius: '999px', padding: '6px 10px', fontSize: '0.72rem', fontWeight: 700 }}>✦ OCR + vision</span>
          <span style={{ color: '#86EFAC', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(134,239,172,0.18)', borderRadius: '999px', padding: '6px 10px', fontSize: '0.72rem', fontWeight: 700 }}>✓ Manager review</span>
        </div>
      </div>

      {!draft ? (
        <div style={{ padding: '0 26px 26px' }}>
          <div
            onDragOver={event => { event.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={event => { event.preventDefault(); setIsDragging(false); chooseFile(event.dataTransfer.files[0]) }}
            onClick={() => inputRef.current?.click()}
            style={{
              minHeight: '190px',
              border: `1px dashed ${isDragging ? '#FF8C5A' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '16px',
              background: isDragging ? 'rgba(255,107,53,0.12)' : 'rgba(12,12,25,0.24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '22px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {previewUrl ? (
              <Image src={previewUrl} alt="Selected menu preview" width={88} height={120} unoptimized style={{ width: '88px', height: '120px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.14)' }} />
            ) : (
              <div style={{ width: '58px', height: '58px', borderRadius: '18px', display: 'grid', placeItems: 'center', background: 'rgba(255,107,53,0.16)', fontSize: '1.7rem' }}>📸</div>
            )}
            <div>
              <div style={{ color: '#F5F5F5', fontWeight: 800, marginBottom: '6px' }}>{file ? file.name : 'Drop your menu photo here'}</div>
              <div style={{ color: '#A3A3A3', fontSize: '0.8rem', marginBottom: '14px' }}>JPG, PNG, or WebP · up to 10 MB · clear photos work best</div>
              <button type="button" className="btn btn-secondary" onClick={event => { event.stopPropagation(); inputRef.current?.click() }}>
                {file ? 'Choose another photo' : 'Browse files'}
              </button>
            </div>
          </div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => chooseFile(event.target.files?.[0])} />

          {file && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
              <button type="button" className="btn btn-secondary" onClick={reset}>Clear</button>
              <button type="button" className="btn btn-primary" onClick={extract} disabled={isExtracting}>
                {isExtracting ? 'Reading menu…' : '✦ Extract menu'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '0 26px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(12,12,25,0.34)', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ color: '#D4D4D8', fontSize: '0.8rem' }}><strong style={{ color: '#F5F5F5' }}>{draft.categories.length} categories</strong> · <strong style={{ color: '#F5F5F5' }}>{itemCount} items</strong> detected · review before saving</div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={reset}>Start over</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto', paddingRight: '3px' }}>
            {draft.categories.map((category, categoryIndex) => (
              <div key={`${category.name}-${categoryIndex}`} style={{ background: 'rgba(12,12,25,0.32)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) minmax(180px, 1.5fr) auto', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                  <input className="form-input" value={category.name} onChange={event => setDraft(current => current ? { ...current, categories: current.categories.map((item, index) => index === categoryIndex ? { ...item, name: event.target.value } : item) } : current)} aria-label="Category name" />
                  <input className="form-input" value={category.description ?? ''} onChange={event => setDraft(current => current ? { ...current, categories: current.categories.map((item, index) => index === categoryIndex ? { ...item, description: event.target.value || null } : item) } : current)} placeholder="Category description" aria-label="Category description" />
                  <span style={{ color: '#A3A3A3', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{category.items.length} items</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {category.items.map((item, itemIndex) => (
                    <div key={`${item.name}-${itemIndex}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) minmax(150px, 1.4fr) 110px 34px', gap: '8px', alignItems: 'center' }}>
                      <input className="form-input" value={item.name} onChange={event => setDraft(current => current ? updateItem(current, categoryIndex, itemIndex, { name: event.target.value }) : current)} aria-label="Item name" />
                      <input className="form-input" value={item.description ?? ''} onChange={event => setDraft(current => current ? updateItem(current, categoryIndex, itemIndex, { description: event.target.value || null }) : current)} placeholder="Description" aria-label="Item description" />
                      <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: '10px', top: '9px', color: '#737373', fontSize: '0.8rem' }}>₹</span><input className="form-input" type="number" min="0" step="0.01" value={item.price} onChange={event => setDraft(current => current ? updateItem(current, categoryIndex, itemIndex, { price: Number(event.target.value) }) : current)} style={{ paddingLeft: '24px' }} aria-label="Item price" /></div>
                      <button type="button" onClick={() => setDraft(current => current ? { ...current, categories: current.categories.map((categoryItem, index) => index === categoryIndex ? { ...categoryItem, items: categoryItem.items.filter((_, position) => position !== itemIndex) } : categoryItem) } : current)} style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#FCA5A5', cursor: 'pointer' }} aria-label={`Remove ${item.name}`}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
            <span style={{ color: '#A3A3A3', fontSize: '0.76rem' }}>AI can misread blurry prices. Your review is required before publishing.</span>
            <button type="button" className="btn btn-primary" onClick={apply} disabled={isApplying || itemCount === 0}>{isApplying ? 'Saving menu…' : '✓ Save menu'}</button>
          </div>
        </div>
      )}

      {error && <div style={{ margin: '0 26px 22px', padding: '12px 14px', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.24)', background: 'rgba(239,68,68,0.10)', borderRadius: '10px', fontSize: '0.8rem' }}>⚠️ {error}</div>}
    </section>
  )
}
