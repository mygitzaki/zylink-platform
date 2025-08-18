import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'

export default function PerformanceAnalytics(){
  const { token } = useAuth()
  const [data,setData] = useState({})
  const [error,setError] = useState('')
  
  useEffect(()=>{ 
    apiFetch('/api/analytics/platform',{ token })
      .then(response => {
        console.log('📊 Platform analytics response:', response)
        setData(response)
      })
      .catch(e => {
        console.error('❌ Analytics error:', e)
        setError(e.message)
      }) 
  },[token])

  const conversionRate = data.overview?.clicks > 0 ? ((data.overview.conversions / data.overview.clicks) * 100).toFixed(2) : 0
  const revenuePerClick = data.overview?.clicks > 0 ? (data.overview.revenue / data.overview.clicks).toFixed(2) : 0

  return (
    <div className="modern-admin-container">
      <div className="admin-header-modern">
        <div>
          <h1 className="admin-title-modern">Performance Analytics</h1>
          <p className="admin-subtitle-modern">Platform-wide performance metrics and insights</p>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {!data.overview ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading platform analytics...</p>
        </div>
      ) : (
        <>
          <div className="modern-stats-grid">
            <div className="modern-stat-card">
              <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Total Creators</div>
                <div className="stat-value">{data.overview.creators || 0}</div>
                <div className="stat-change positive">Active creators</div>
              </div>
            </div>

            <div className="modern-stat-card">
              <div className="stat-icon" style={{ background: '#3b82f620', color: '#3b82f6' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Total Links</div>
                <div className="stat-value">{data.overview.links || 0}</div>
                <div className="stat-change positive">Generated links</div>
              </div>
            </div>

            <div className="modern-stat-card">
              <div className="stat-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Total Clicks</div>
                <div className="stat-value">{data.overview.clicks || 0}</div>
                <div className="stat-change positive">Link clicks</div>
              </div>
            </div>

            <div className="modern-stat-card">
              <div className="stat-icon" style={{ background: '#8b5cf620', color: '#8b5cf6' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Conversions</div>
                <div className="stat-value">{data.overview.conversions || 0}</div>
                <div className="stat-change positive">{conversionRate}% rate</div>
              </div>
            </div>

            <div className="modern-stat-card">
              <div className="stat-icon" style={{ background: '#ef444420', color: '#ef4444' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Revenue</div>
                <div className="stat-value">${Number(data.overview.revenue || 0).toFixed(2)}</div>
                <div className="stat-change positive">${revenuePerClick}/click</div>
              </div>
            </div>
          </div>

          <div className="section-header">
            <h2 className="section-title">Performance Insights</h2>
            <p className="section-subtitle">Key metrics and analytics for your platform</p>
          </div>

          <div className="analytics-insights">
            <div className="insight-card">
              <h3>Conversion Rate</h3>
              <div className="insight-value">{conversionRate}%</div>
              <p>of clicks result in conversions</p>
            </div>
            
            <div className="insight-card">
              <h3>Revenue per Click</h3>
              <div className="insight-value">${revenuePerClick}</div>
              <p>average revenue generated per click</p>
            </div>
            
            <div className="insight-card">
              <h3>Links per Creator</h3>
              <div className="insight-value">{data.overview.creators > 0 ? (data.overview.links / data.overview.creators).toFixed(1) : 0}</div>
              <p>average links created per creator</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


