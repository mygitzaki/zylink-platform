import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'

export default function AnalyticsV2() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState({
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    conversionRate: 0,
    averageOrderValue: 0,
    topPerformingLinks: [],
    recentActivity: [],
    monthlyTrends: []
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const [analyticsRes, earningsRes] = await Promise.all([
        apiFetch('/api/creator/analytics'),
        apiFetch('/api/creator/earnings')
      ])
      
      setAnalytics({
        totalClicks: analyticsRes.clicks || 0,
        totalConversions: analyticsRes.conversions || 0,
        totalRevenue: earningsRes.total || 0,
        conversionRate: analyticsRes.clicks > 0 ? ((analyticsRes.conversions || 0) / analyticsRes.clicks * 100) : 0,
        averageOrderValue: analyticsRes.conversions > 0 ? (earningsRes.total || 0) / analyticsRes.conversions : 0,
        topPerformingLinks: analyticsRes.topLinks || [],
        recentActivity: analyticsRes.recentActivity || [],
        monthlyTrends: analyticsRes.monthlyTrends || []
      })
    } catch (err) {
      console.error('Failed to load analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="creator-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="creator-dashboard">
      {/* Hero Section */}
      <div className="hero-section analytics-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Analytics Dashboard
          </h1>
          <p className="hero-subtitle">
            Track your performance and optimize your affiliate strategy
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
        {/* Key Metrics */}
        <div className="metrics-grid">
          <div className="metric-card primary">
            <div className="metric-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122" />
              </svg>
            </div>
            <div className="metric-content">
              <h3 className="metric-value">${analytics.totalRevenue.toFixed(2)}</h3>
              <p className="metric-label">Total Revenue</p>
              <span className="metric-change positive">+12.5% vs last period</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="metric-content">
              <h3 className="metric-value">{analytics.totalClicks.toLocaleString()}</h3>
              <p className="metric-label">Total Clicks</p>
              <span className="metric-change positive">+8.2% vs last period</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="metric-content">
              <h3 className="metric-value">{analytics.totalConversions.toLocaleString()}</h3>
              <p className="metric-label">Conversions</p>
              <span className="metric-change positive">+15.3% vs last period</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="metric-content">
              <h3 className="metric-value">{analytics.conversionRate.toFixed(2)}%</h3>
              <p className="metric-label">Conversion Rate</p>
              <span className="metric-change positive">+2.1% vs last period</span>
            </div>
          </div>
        </div>

        <div className="content-grid">
          {/* Performance Chart */}
          <div className="chart-section">
            <div className="section-header">
              <h2 className="section-title">Performance Overview</h2>
              <p className="section-subtitle">Your revenue and conversion trends</p>
            </div>
            
            <div className="chart-container">
              <div className="chart-placeholder">
                <div className="chart-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3>Performance Chart</h3>
                <p>Interactive charts coming soon with Chart.js integration</p>
              </div>
            </div>
          </div>

          {/* Top Performing Links */}
          <div className="top-links-section">
            <div className="section-header">
              <h2 className="section-title">Top Performing Links</h2>
              <p className="section-subtitle">Your highest converting affiliate links</p>
            </div>
            
            <div className="links-list">
              {analytics.topPerformingLinks.length > 0 ? (
                analytics.topPerformingLinks.map((link, index) => (
                  <div key={link.id} className="link-item">
                    <div className="link-rank">#{index + 1}</div>
                    <div className="link-info">
                      <div className="link-url">{link.destinationUrl}</div>
                      <div className="link-stats">
                        <span>{link.clicks || 0} clicks</span>
                        <span>•</span>
                        <span>${Number(link.revenue || 0).toFixed(2)} earned</span>
                      </div>
                    </div>
                    <div className="link-performance">
                      <div className="performance-bar">
                        <div 
                          className="performance-fill" 
                          style={{ width: `${Math.min((link.revenue || 0) / 100 * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <h3>No links yet</h3>
                  <p>Generate your first affiliate link to see performance data</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="activity-section">
          <div className="section-header">
            <h2 className="section-title">Recent Activity</h2>
            <p className="section-subtitle">Your latest clicks, conversions, and earnings</p>
          </div>
          
          <div className="activity-timeline">
            {analytics.recentActivity.length > 0 ? (
              analytics.recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className={`activity-icon ${activity.type.toLowerCase()}`}>
                    {activity.type === 'LINK_CREATED' && '🔗'}
                    {activity.type === 'EARNING' && '💰'}
                    {activity.type === 'CLICK' && '👆'}
                    {activity.type === 'CONVERSION' && '🎯'}
                  </div>
                  <div className="activity-content">
                    <div className="activity-description">{activity.description}</div>
                    <div className="activity-time">{activity.time}</div>
                  </div>
                  {activity.amount && (
                    <div className="activity-amount">{activity.amount}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3>No activity yet</h3>
                <p>Your activity will appear here as you generate links and earn commissions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}




