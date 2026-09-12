'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateQRToken, generateQRDataUrl, downloadQRCode, buildQRUrl } from '@/lib/utils/qr'
import { TABLE_STATUS_CONFIG } from '@/lib/types/app.types'
import Image from 'next/image'

interface QRCode {
  id: string
  token: string
  is_active: boolean
  scan_count: number
  last_scanned_at: string | null
}

interface Table {
  id: string
  table_number: string
  display_name: string | null
  capacity: number | null
  status: string
  floor: string | null
  section: string | null
  is_active: boolean
  qr_codes: QRCode[]
}

interface Branch {
  id: string
  name: string
}

interface Props {
  tables: Table[]
  branches: Branch[]
  restaurantId: string
  currentBranchId: string | null
}

export default function TablesPageClient({ tables: initialTables, branches, restaurantId, currentBranchId }: Props) {
  const supabase = createClient()
  const [tables, setTables] = useState<Table[]>(initialTables)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAddingTable, setIsAddingTable] = useState(false)
  const [newTableNumber, setNewTableNumber] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState(currentBranchId ?? branches[0]?.id ?? '')

  const refreshTables = useCallback(async () => {
    const { data } = await supabase
      .from('restaurant_tables')
      .select(`
        id, table_number, display_name, capacity, status, floor, section, is_active,
        qr_codes(id, token, is_active, scan_count, last_scanned_at)
      `)
      .eq('branch_id', selectedBranchId)
      .order('table_number', { ascending: true })

    if (data) setTables(data as unknown as Table[])
  }, [selectedBranchId, supabase])

  useEffect(() => {
    refreshTables()
  }, [refreshTables])

  const generateQR = async (table: Table) => {
    setIsGenerating(true)
    const token = generateQRToken()

    // Save to database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('qr_codes') as any).insert({
      table_id: table.id,
      branch_id: selectedBranchId,
      restaurant_id: restaurantId,
      token,
      is_active: true,
    })

    if (!error) {
      const dataUrl = await generateQRDataUrl(token, {
        size: 300,
        darkColor: '#1A1A2E',
        lightColor: '#FFFFFF',
      })
      setQrDataUrl(dataUrl)
      setSelectedTable(table)
      await refreshTables()
    }
    setIsGenerating(false)
  }

  const viewQR = async (table: Table) => {
    const activeQR = table.qr_codes.find(q => q.is_active)
    if (!activeQR) {
      await generateQR(table)
      return
    }

    const dataUrl = await generateQRDataUrl(activeQR.token, {
      size: 300,
      darkColor: '#1A1A2E',
    })
    setQrDataUrl(dataUrl)
    setSelectedTable(table)
  }

  const addTable = async () => {
    if (!newTableNumber.trim()) return
    setIsAddingTable(false)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('restaurant_tables') as any).insert({
      restaurant_id: restaurantId,
      branch_id: selectedBranchId,
      table_number: newTableNumber.trim(),
      display_name: newDisplayName.trim() || null,
      status: 'available',
    })

    setNewTableNumber('')
    setNewDisplayName('')
    await refreshTables()
  }

  const activeQR = selectedTable?.qr_codes.find(q => q.is_active)

  return (
    <main className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tables & QR Codes</h1>
          <p className="page-subtitle">{tables.length} tables configured</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsAddingTable(true)}
        >
          + Add Table
        </button>
      </div>

      {/* Branch selector (if multiple branches) */}
      {branches.length > 1 && (
        <div style={{ marginBottom: '20px' }}>
          <select
            value={selectedBranchId}
            onChange={e => setSelectedBranchId(e.target.value)}
            className="form-select"
            style={{ maxWidth: '240px' }}
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🪑</div>
          <h2 className="empty-state-title">No Tables Yet</h2>
          <p className="empty-state-desc">Add your first table to generate QR codes for customers.</p>
          <button className="btn btn-primary" onClick={() => setIsAddingTable(true)} style={{ marginTop: '16px' }}>
            Add Table
          </button>
        </div>
      ) : (
        <div className="tables-grid">
          {tables.map(table => {
            const statusConfig = TABLE_STATUS_CONFIG[table.status as keyof typeof TABLE_STATUS_CONFIG] ?? TABLE_STATUS_CONFIG.available
            const activeQRCode = table.qr_codes.find(q => q.is_active)

            return (
              <div
                key={table.id}
                className="table-card"
                style={{ '--table-status-color': statusConfig.color } as React.CSSProperties}
                onClick={() => viewQR(table)}
              >
                <div className="table-number">{table.table_number}</div>
                {table.display_name && (
                  <div style={{ fontSize: '0.72rem', color: '#737373', marginBottom: '4px' }}>
                    {table.display_name}
                  </div>
                )}
                <div className="table-status-text">{statusConfig.label}</div>

                {/* QR indicator */}
                <div style={{ marginTop: '8px' }}>
                  {activeQRCode ? (
                    <span style={{ fontSize: '0.68rem', color: '#22C55E', fontWeight: 600 }}>
                      ✓ QR Active · {activeQRCode.scan_count} scans
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: '#737373' }}>No QR</span>
                  )}
                </div>

                {table.capacity && (
                  <div style={{ fontSize: '0.7rem', color: '#525252', marginTop: '4px' }}>
                    👥 {table.capacity}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* QR Code Modal */}
      {selectedTable && qrDataUrl && (
        <div className="modal-overlay" onClick={() => { setSelectedTable(null); setQrDataUrl(null) }}>
          <div
            className="modal"
            style={{ maxWidth: '380px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F5F5F5', marginBottom: '4px' }}>
                {selectedTable.display_name ?? `Table ${selectedTable.table_number}`}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#737373', marginBottom: '24px' }}>
                QR Code · {activeQR?.scan_count ?? 0} total scans
              </p>

              {/* QR Image */}
              <div className="qr-image-wrapper" style={{ margin: '0 auto 20px' }}>
                <Image
                  src={qrDataUrl}
                  alt={`QR code for table ${selectedTable.table_number}`}
                  width={200}
                  height={200}
                  style={{ imageRendering: 'pixelated' }}
                  unoptimized
                />
              </div>

              {/* URL */}
              {activeQR && (
                <div
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '10px',
                    marginBottom: '20px',
                    fontSize: '0.72rem',
                    color: '#737373',
                    wordBreak: 'break-all',
                    textAlign: 'left',
                  }}
                >
                  {buildQRUrl(activeQR.token)}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-secondary flex-1"
                  onClick={() => {
                    if (activeQR) {
                      downloadQRCode(activeQR.token, `table-${selectedTable.table_number}`)
                    }
                  }}
                >
                  ⬇️ Download PNG
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setQrDataUrl(null)
                    generateQR(selectedTable)
                  }}
                  disabled={isGenerating}
                >
                  🔄 Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {isAddingTable && (
        <div className="modal-overlay" onClick={() => setIsAddingTable(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F5F5F5', marginBottom: '20px' }}>
                Add New Table
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Table Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 1, 2A, T12"
                    value={newTableNumber}
                    onChange={e => setNewTableNumber(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Display Name (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Window Table, Patio 3"
                    value={newDisplayName}
                    onChange={e => setNewDisplayName(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button className="btn btn-secondary flex-1" onClick={() => setIsAddingTable(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary flex-1"
                    onClick={addTable}
                    disabled={!newTableNumber.trim()}
                  >
                    Add Table
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
