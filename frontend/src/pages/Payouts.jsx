import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'

export default function Payouts(){
  const { token } = useAuth()
  const [rows,setRows] = useState([])
  const [amount,setAmount] = useState('')
  const [msg,setMsg] = useState('')
  const [error,setError] = useState('')

  const load = useCallback(async () => {
    try { const d = await apiFetch('/api/creator/payouts',{ token }); setRows(d.payouts||[]) } catch(e){ setError(e.message) }
  }, [token])

  useEffect(()=>{ load() },[load])

  async function requestPayout(e){
    e.preventDefault(); setMsg(''); setError('')
    try {
      await apiFetch('/api/creator/payouts/request',{ method:'POST', token, body:{ amount: Number(amount) } })
      setMsg('Payout requested'); setAmount(''); await load()
    } catch(e){ setError(e.message) }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Payouts</h1>
      <form onSubmit={requestPayout} className="flex gap-2 mb-4">
        <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount" className="border rounded px-3 py-2"/>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Request</button>
      </form>
      {msg && <p className="text-green-700">{msg}</p>}
      {error && <p className="text-red-600">{error}</p>}
      <table className="min-w-full text-sm mt-3">
        <thead><tr className="border-b"><th className="p-2">Amount</th><th className="p-2">Status</th><th className="p-2">Requested</th><th className="p-2">Approved</th></tr></thead>
        <tbody>
          {rows.map(r=> (
            <tr key={r.id} className="border-b">
              <td className="p-2">${Number(r.amount||0).toFixed(2)}</td>
              <td className="p-2">{r.status}</td>
              <td className="p-2">{new Date(r.createdAt).toLocaleString()}</td>
              <td className="p-2">{r.approvedAt? new Date(r.approvedAt).toLocaleString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}




