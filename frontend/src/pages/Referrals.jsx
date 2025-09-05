import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'

export default function Referrals(){
  const { token } = useAuth()
  const [code, setCode] = useState('')
  const [summary, setSummary] = useState({ 
    count: 0, 
    total: 0,
    pending: 0,
    thisMonth: 0,
    referrals: [],
    // 🚀 REFERRAL BONUS DATA
    referralBonuses: 0,
    referralBonusesThisMonth: 0,
    pendingReferralBonuses: 0
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [codeLoading, setCodeLoading] = useState(false)

  const ensureCode = useCallback(async () => {
    try {
      setCodeLoading(true)
      setError('')
      const res = await apiFetch('/api/creator/referral-code', { 
        method: 'POST', 
        token 
      })
      setCode(res.referralCode || '')
      if (res.referralCode) {
        setSuccess('Referral code loaded successfully!')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (e) {
      setError(e.message || 'Failed to load referral code')
      setTimeout(() => setError(''), 5000)
    } finally {
      setCodeLoading(false)
    }
  }, [token])
  
  const loadSummary = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await apiFetch('/api/creator/referrals', { token })
      setSummary(res)
    } catch (e) {
      setError(e.message || 'Failed to load referral data')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      ensureCode()
      loadSummary()
    }
  }, [ensureCode, loadSummary, token])

  const shareLink = code ? `${window.location.origin}/signup?ref=${code}` : ''
  
  const copyToClipboard = (text) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setSuccess('Copied to clipboard!')
    setTimeout(() => {
      setCopied(false)
      setSuccess('')
    }, 2000)
  }

  const refreshData = async () => {
    await Promise.all([ensureCode(), loadSummary()])
  }

  const bonusRate = 10 // 10% for 6 months
  const bonusPeriod = 6 // months

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your referral data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Referrals</h1>
          <p className="dashboard-subtitle">Referral code and bonus tracking</p>
        </div>
        <div className="referral-bonus-info">
          <span className="bonus-rate">{bonusRate}% bonus</span>
          <span className="bonus-period">for {bonusPeriod} months</span>
        </div>
      </div>
      
      {/* Messages */}
      {error && (
        <div className="error-message">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}

      {/* Referral Code Generation */}
      <div className="referral-code-section">
        <div className="section-header">
          <h2 className="section-title">Your Referral Code</h2>
          <p className="section-subtitle">Share your referral code and earn 10% bonus from referrals for 6 months</p>
        </div>
        
        <div className="referral-code-card">
          <div className="code-display">
            <label>Referral Code</label>
            <div className="code-value">
              <span className="code-text">
                {codeLoading ? 'Generating...' : (code || 'No code available')}
              </span>
              <button 
                onClick={() => copyToClipboard(code)} 
                className="copy-btn"
                disabled={!code || codeLoading}
              >
                {copied ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          <div className="share-link-display">
            <label>Share Link</label>
            <div className="link-value">
              <span className="link-text">{shareLink || 'Generate code first'}</span>
              <button 
                onClick={() => copyToClipboard(shareLink)} 
                className="copy-btn"
                disabled={!shareLink}
              >
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
          
          <div className="code-actions">
            <button 
              onClick={refreshData}
              className="btn-secondary"
              disabled={codeLoading}
            >
              {codeLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Referral Tracking Stats */}
      <div className="modern-stats-grid">
        <div className="modern-stat-card">
          <div className="stat-icon" style={{ background: '#3b82f620', color: '#3b82f6' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Referrals</div>
            <div className="stat-value">{summary.count}</div>
            <div className="stat-change positive">Network growth</div>
          </div>
        </div>

        <div className="modern-stat-card">
          <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Bonus</div>
            <div className="stat-value">${Number(summary.total || 0).toFixed(2)}</div>
            <div className="stat-change positive">All time earnings</div>
          </div>
        </div>

        <div className="modern-stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">This Month</div>
            <div className="stat-value">${Number(summary.thisMonth || 0).toFixed(2)}</div>
            <div className="stat-change positive">Monthly bonus</div>
          </div>
        </div>

        <div className="modern-stat-card">
          <div className="stat-icon" style={{ background: '#8b5cf620', color: '#8b5cf6' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Pending Bonus</div>
            <div className="stat-value">${Number(summary.pending || 0).toFixed(2)}</div>
            <div className="stat-change positive">Processing</div>
          </div>
        </div>
      </div>

      {/* 🚀 REFERRAL BONUS EARNINGS - New Section */}
      <div className="modern-stats-grid" style={{ marginTop: '2rem' }}>
        <div className="modern-stat-card">
          <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Referral Bonuses Earned</div>
            <div className="stat-value">${Number(summary.referralBonuses || 0).toFixed(2)}</div>
            <div className="stat-change positive">Actual bonuses received</div>
          </div>
        </div>

        <div className="modern-stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">This Month Bonuses</div>
            <div className="stat-value">${Number(summary.referralBonusesThisMonth || 0).toFixed(2)}</div>
            <div className="stat-change positive">Monthly bonus earnings</div>
          </div>
        </div>

        <div className="modern-stat-card">
          <div className="stat-icon" style={{ background: '#ef444420', color: '#ef4444' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Pending Bonuses</div>
            <div className="stat-value">${Number(summary.pendingReferralBonuses || 0).toFixed(2)}</div>
            <div className="stat-change positive">Awaiting approval</div>
          </div>
        </div>

        <div className="modern-stat-card">
          <div className="stat-icon" style={{ background: '#6366f120', color: '#6366f1' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Active Referrals</div>
            <div className="stat-value">{summary.count}</div>
            <div className="stat-change positive">Currently earning bonuses</div>
          </div>
        </div>
      </div>

      {/* Bonus Calculations */}
      <div className="analytics-section">
        <div className="section-header">
          <h2 className="section-title">Bonus Calculations</h2>
          <p className="section-subtitle">How your referral bonuses are calculated</p>
        </div>
        
        <div className="bonus-calculation-card">
          <h4>Referral Bonus Structure</h4>
          <div className="calculation-details">
            <div className="calculation-item">
              <span className="calc-label">Bonus Rate</span>
              <span className="calc-value">{bonusRate}%</span>
            </div>
            <div className="calculation-item">
              <span className="calc-label">Bonus Period</span>
              <span className="calc-value">{bonusPeriod} months</span>
            </div>
            <div className="calculation-item">
              <span className="calc-label">Calculation</span>
              <span className="calc-value">10% of referral's monthly earnings</span>
            </div>
          </div>
          
          <div className="example-calculation">
            <h5>Example:</h5>
            <p>If your referral earns $500 in a month, you get $50 bonus (10%)</p>
            <p>This continues for 6 months from their signup date</p>
          </div>
        </div>
      </div>

      {/* Network Growth */}
      <div className="analytics-section">
        <div className="section-header">
          <h2 className="section-title">Network Growth</h2>
          <p className="section-subtitle">Track your referral network expansion</p>
        </div>
        
        <div className="network-grid">
          <div className="network-metric">
            <h4>Active Referrals</h4>
            <span className="network-value">{summary.count}</span>
            <p>Currently generating bonuses</p>
          </div>
          
          <div className="network-metric">
            <h4>Network Value</h4>
            <span className="network-value">${Number(summary.total * 10).toFixed(0)}</span>
            <p>Total network earnings generated</p>
          </div>
          
          <div className="network-metric">
            <h4>Growth Rate</h4>
            <span className="network-value">
              {summary.count > 0 ? '+12%' : '0%'}
            </span>
            <p>Monthly network expansion</p>
          </div>
        </div>
      </div>

      {/* Recent Referrals */}
      <div className="analytics-section">
        <div className="section-header">
          <h2 className="section-title">Recent Referrals</h2>
          <p className="section-subtitle">Your latest referral activity</p>
        </div>
        
        {summary.referrals.length > 0 ? (
          <div className="referrals-table">
            <div className="table-header">
              <span>Date</span>
              <span>Referral</span>
              <span>Status</span>
              <span>Monthly Bonus</span>
              <span>Remaining</span>
            </div>
            
            <div className="table-body">
              {summary.referrals.map((referral, index) => (
                <div key={referral.id || index} className="table-row">
                  <span>{new Date(referral.date).toLocaleDateString()}</span>
                  <span>{referral.referralName}</span>
                  <span className={`status ${referral.status?.toLowerCase() || 'active'}`}>
                    {referral.status || 'Active'}
                  </span>
                  <span>${Number(referral.monthlyBonus || 0).toFixed(2)}</span>
                  <span>{referral.remainingMonths} months</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3>No Referrals Yet</h3>
            <p>Start sharing your referral code to build your network and earn bonuses!</p>
            <button onClick={refreshData} className="btn-primary">
              Refresh Data
            </button>
          </div>
        )}
      </div>
    </div>
  )
}




