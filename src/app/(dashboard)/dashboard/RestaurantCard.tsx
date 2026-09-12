'use client'

import Link from 'next/link'

interface RestaurantProps {
  rest: {
    id: string
    name: string
    city: string
    currency_symbol?: string | null
  }
}

export default function RestaurantCard({ rest }: RestaurantProps) {
  return (
    <Link href={`/dashboard/${rest.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#1A1A2E',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '24px',
        transition: 'all 0.2s',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
      onMouseOver={(e) => e.currentTarget.style.borderColor = '#FF6B35'}
      onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,107,53,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
            🍽️
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#F5F5F5', fontSize: '1.1rem' }}>{rest.name}</h3>
            <p style={{ margin: 0, color: '#737373', fontSize: '0.85rem', marginTop: '4px' }}>
              {rest.city} • {rest.currency_symbol || '₹'}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}
