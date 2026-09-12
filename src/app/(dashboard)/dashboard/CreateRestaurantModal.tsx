'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateRestaurantModal({ 
  action, 
  maxRestaurants, 
  currentCount 
}: { 
  action: any, 
  maxRestaurants: number, 
  currentCount: number 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    try {
      const res = await action(formData)
      if (res.error) {
        setError(res.error)
      } else {
        setIsOpen(false)
        router.refresh()
        if (res.restaurantId) {
           router.push(`/dashboard/${res.restaurantId}`)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          background: '#FF6B35',
          color: 'white',
          padding: '10px 16px',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        + Create Restaurant ({currentCount}/{maxRestaurants})
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            background: '#1A1A2E',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '500px'
          }}>
            <h2 style={{ margin: 0, marginBottom: '24px', color: '#FFF' }}>Create New Restaurant</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#A3A3A3', fontSize: '0.9rem' }}>Restaurant Name</label>
                <input name="name" required style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FFF' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#A3A3A3', fontSize: '0.9rem' }}>Identifier (Slug)</label>
                <input name="slug" required pattern="[a-z0-9-]+" title="Only lowercase letters, numbers, and hyphens" placeholder="e.g. my-restaurant" style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FFF' }} />
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#737373' }}>This will be used for your QR codes and menus.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#A3A3A3', fontSize: '0.9rem' }}>City</label>
                  <input name="city" required style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FFF' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#A3A3A3', fontSize: '0.9rem' }}>Currency</label>
                  <select name="currency" required style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FFF' }}>
                    <option value="₹">INR (₹)</option>
                    <option value="$">USD ($)</option>
                    <option value="€">EUR (€)</option>
                    <option value="£">GBP (£)</option>
                  </select>
                </div>
              </div>

              {error && <div style={{ color: '#FCA5A5', padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', fontSize: '0.9rem' }}>{error}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsOpen(false)} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isLoading} style={{ padding: '10px 16px', background: '#FF6B35', border: 'none', color: '#FFF', borderRadius: '8px', cursor: isLoading ? 'not-allowed' : 'pointer' }}>{isLoading ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
