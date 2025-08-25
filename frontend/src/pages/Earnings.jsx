import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'

export default function Earnings() {
  const { user, token } = useAuth()
  const [earnings, setEarnings] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    pending: 0,
    available: 0,
    history: [],
    topEarningDays: []
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [pendingNet, setPendingNet] = useState(0)
  const [approvedNet, setApprovedNet] = useState(0)
  const [lifetimeNet, setLifetimeNet] = useState(0)
  const [paidOut, setPaidOut] = useState(0)
  const [available, setAvailable] = useState(0)

  useEffect(() => {
    loadEarnings()
    loadPending()
  }, [timeRange])

  const loadEarnings = async () => {
    try {
      setLoading(true)
      const earningsRes = await apiFetch('/api/creator/earnings', { token })

      const items = Array.isArray(earningsRes.earnings) ? earningsRes.earnings : []
      const toNum = (v) => Number(v || 0)
      const sum = (arr) => arr.reduce((s, x) => s + toNum(x), 0)

      // Compute approved (COMPLETED) net
      const approved = sum(items.filter(i => i.status === 'COMPLETED').map(i => i.amount))
      setApprovedNet(approved)

      // Lifetime net (prefer summary.total, fallback to legacy total, fallback to approved)
      const lifetime = Number(earningsRes?.summary?.total ?? earningsRes?.total ?? approved)
      setLifetimeNet(lifetime)

      // Time buckets (based on completed items)
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const dayOfWeek = startOfDay.getDay() || 0 // 0=Sun
      const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - dayOfWeek)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const getDate = (d) => new Date(d)
      const completed = items.filter(i => i.status === 'COMPLETED')
      const todayAmt = sum(completed.filter(i => getDate(i.createdAt) >= startOfDay).map(i => i.amount))
      const weekAmt = sum(completed.filter(i => getDate(i.createdAt) >= startOfWeek).map(i => i.amount))
      const monthAmt = sum(completed.filter(i => getDate(i.createdAt) >= startOfMonth).map(i => i.amount))

      // History mapping for table
      const history = items.map(i => ({
        date: new Date(i.createdAt).toLocaleDateString(),
        type: i.type,
        description: i.link?.destinationUrl || i.impactTransactionId || 'Commission',
        amount: Number(i.amount || 0),
        status: i.status
      }))

      setEarnings({
        total: lifetime,
        today: todayAmt,
        thisWeek: weekAmt,
        thisMonth: monthAmt,
        pending: 0, // filled by loadPending
        available: 0, // filled after payouts load
        history,
        topEarningDays: []
      })

      // After we know approved, compute payouts/available
      await loadPayouts(approved)
    } catch (err) {
      console.error('Failed to load earnings:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPending = async () => {
    try {
      const days = timeRange === '7d' ? 7 : (timeRange === '90d' ? 90 : 30)
      const res = await apiFetch(`/api/creator/pending-earnings?days=${days}`, { token })
      setPendingNet(Number(res.pendingNet || 0))
    } catch {}
  }

  // Load payouts and compute available = approved - paidOut
  const loadPayouts = async (approved) => {
    try {
      const res = await apiFetch('/api/creator/payouts', { token })
      const rows = Array.isArray(res.payouts) ? res.payouts : []
      const paid = rows.filter(r => r.status === 'COMPLETED').reduce((s, r) => s + Number(r.amount || 0), 0)
      setPaidOut(paid)
      const avail = Math.max(0, Number(approved || approvedNet) - paid)
      setAvailable(avail)
      // also mirror in the earnings object used by UI cards
      setEarnings(prev => ({ ...prev, pending: pendingNet, available: avail }))
    } catch {}
  }

  if (loading) {
    return (
      <div className="creator-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your earnings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="creator-dashboard">
      {/* Hero Section */}
      <div className="hero-section earnings-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Earnings Dashboard
          </h1>
          <p className="hero-subtitle">
            Track your commissions, bonuses, and referral earnings
          </p>
          
          {/* Time Range Selector */}
          <div className="time-selector">
            <button
              className={`time-btn ${timeRange === '7d' ? 'active' : ''}`}
              onClick={() => setTimeRange('7d')}
            >
              7 Days
            </button>
            <button
              className={`time-btn ${timeRange === '30d' ? 'active' : ''}`}
              onClick={() => setTimeRange('30d')}
            >
              30 Days
            </button>
            <button
              className={`time-btn ${timeRange === '90d' ? 'active' : ''}`}
              onClick={() => setTimeRange('90d')}
            >
              90 Days
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Key Earnings Metrics */}
        <div className="earnings-overview">
          <div className="earnings-card main">
            <div className="earnings-content">
              <h2>Total Earnings</h2>
              <div className="earnings-amount">${earnings.total.toFixed(2)}</div>
              <div className="earnings-today">+${earnings.today.toFixed(2)} today</div>
            </div>
            <div className="earnings-progress">
              <div className="progress-info">
                <span>Monthly Goal</span>
                <span>$1,000</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${Math.min((earnings.thisMonth / 1000) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="progress-text">{Math.min((earnings.thisMonth / 1000) * 100, 100).toFixed(1)}% complete</div>
            </div>
          </div>
        </div>

        {/* Earnings Grid */}
        <div className="earnings-grid">
          <div className="earnings-stat-card">
            <div className="stat-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">This Week</div>
              <div className="stat-value">${earnings.thisWeek.toFixed(2)}</div>
              <div className="stat-change positive">+5.2% vs last week</div>
            </div>
          </div>

          <div className="earnings-stat-card">
            <div className="stat-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">This Month</div>
              <div className="stat-value">${earnings.thisMonth.toFixed(2)}</div>
              <div className="stat-change positive">+12.8% vs last month</div>
            </div>
          </div>

          <div className="earnings-stat-card">
            <div className="stat-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">Pending</div>
              <div className="stat-value">${pendingNet.toFixed(2)}</div>
              <div className="stat-change neutral">Awaiting approval</div>
            </div>
          </div>

          <div className="earnings-stat-card">
            <div className="stat-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">Available</div>
              <div className="stat-value">${earnings.available.toFixed(2)}</div>
              <div className="stat-change positive">Ready to withdraw</div>
            </div>
          </div>
        </div>

        <div className="content-grid">
          {/* Earnings Chart */}
          <div className="chart-section">
            <div className="section-header">
              <h2 className="section-title">Earnings Trend</h2>
              <p className="section-subtitle">Your daily earnings over time</p>
            </div>
            
            <div className="chart-container">
              <div className="chart-placeholder">
                <div className="chart-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3>Earnings Chart</h3>
                <p>Interactive earnings visualization coming soon</p>
              </div>
            </div>
          </div>

          {/* Top Earning Days */}
          <div className="top-days-section">
            <div className="section-header">
              <h2 className="section-title">Top Earning Days</h2>
              <p className="section-subtitle">Your highest performing days</p>
            </div>
            
            <div className="days-list">
              {earnings.topEarningDays.length > 0 ? (
                earnings.topEarningDays.map((day, index) => (
                  <div key={index} className="day-item">
                    <div className="day-rank">#{index + 1}</div>
                    <div className="day-info">
                      <div className="day-date">{day.date}</div>
                      <div className="day-amount">${day.amount.toFixed(2)}</div>
                    </div>
                    <div className="day-performance">
                      <div className="performance-bar">
                        <div 
                          className="performance-fill" 
                          style={{ width: `${Math.min((day.amount / 100) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3>No earnings yet</h3>
                  <p>Your top earning days will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Earnings History */}
        <div className="history-section">
          <div className="section-header">
            <h2 className="section-title">Earnings History</h2>
            <p className="section-subtitle">Detailed breakdown of your earnings</p>
          </div>
          
          <div className="history-table">
            {earnings.history.length > 0 ? (
              <div className="table-container">
                <table className="earnings-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.history.map((item, index) => (
                      <tr key={index}>
                        <td>{item.date}</td>
                        <td>
                          <span className={`earnings-type ${item.type.toLowerCase()}`}>
                            {item.type}
                          </span>
                        </td>
                        <td>{item.description}</td>
                        <td className="amount">${item.amount.toFixed(2)}</td>
                        <td>
                          <span className={`status ${item.status.toLowerCase()}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3>No earnings history</h3>
                <p>Your earnings history will appear here as you generate commissions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}




