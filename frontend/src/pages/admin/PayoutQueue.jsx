import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'

export default function PayoutQueue(){
  const { token } = useAuth()
  const [rows,setRows] = useState([])
  const [error,setError] = useState('')

  const load = useCallback(async () => {
    try { const d = await apiFetch('/api/admin/payouts?status=PENDING',{ token }); setRows(d.payouts||[]) } catch(e){ setError(e.message) }
  }, [token])
  
  useEffect(()=>{ load() },[load])

  async function approve(id){ await apiFetch(`/api/admin/payouts/${id}/approve`,{ method:'PUT', token }); await load() }
  async function reject(id){ await apiFetch(`/api/admin/payouts/${id}/reject`,{ method:'PUT', token }); await load() }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1 className="admin-title">Payout Queue</h1>
        <p className="admin-subtitle">Review and process pending creator payouts</p>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="card">
        <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Creator</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Amount</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Requested</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No pending payouts
                </td>
              </tr>
            ) : (
              rows.map(r=> (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem' }}>{r.creatorId}</td>
                  <td style={{ padding: '0.75rem' }}>${Number(r.amount||0).toFixed(2)}</td>
                  <td style={{ padding: '0.75rem' }}>{new Date(r.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={()=>approve(r.id)} 
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#16a34a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Approve
                    </button>
                    <button 
                      onClick={()=>reject(r.id)} 
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}




