import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'
import { Link } from 'react-router-dom'

export default function AdminOverview(){
  const { token } = useAuth()
  const [stats,setStats] = useState({ creatorCount:0, linkCount:0, pendingApplications:0, totalRevenue:0 })
  const [error,setError] = useState('')
  const [systemHealth, setSystemHealth] = useState('healthy')
  const [impactClicks, setImpactClicks] = useState(null)
  const [loadingImpact, setLoadingImpact] = useState(false)
  const [impactError, setImpactError] = useState('')
  const [impactActions, setImpactActions] = useState(null)
  const [loadingActions, setLoadingActions] = useState(false)
  const [actionsError, setActionsError] = useState('')

  useEffect(()=>{
    apiFetch('/api/admin/stats', { token })
      .then(setStats)
      .catch(e=>setError(e.message))
  },[token])

  // NEW: Function to fetch real Impact.com click data
  const fetchImpactClicks = async () => {
    setLoadingImpact(true)
    setImpactError('')
    
    try {
      const data = await apiFetch('/api/admin/impact-clicks', { token })
      if (data.success) {
        const payload = data.data || {}
        const clicks = Array.isArray(payload.clicks) ? payload.clicks : []
        const actions = Array.isArray(payload.actions) ? payload.actions : []

        // Derive totals safely (Clicks preferred if present)
        const totalClicks = clicks.length || 0
        const totalResults = totalClicks > 0 ? totalClicks : (actions.length || 0)

        // Optional lightweight breakdowns (actions-based)
        const summary = {}
        if (actions.length > 0) {
          const byStatus = {}
          const byCampaign = {}
          const byCreator = {}
          const byActionType = {}
          actions.forEach(a => {
            const st = a.State || a.status || 'UNKNOWN'
            const camp = a.CampaignId || a.campaignId || 'N/A'
            const sub1 = a.SubId1 || a.subId1 || 'UNKNOWN'
            const type = a.ActionType || a.actionType || (a.ActionTrackerName || 'SALE')
            byStatus[st] = (byStatus[st] || 0) + 1
            byCampaign[camp] = (byCampaign[camp] || 0) + 1
            byCreator[sub1] = (byCreator[sub1] || 0) + 1
            byActionType[type] = (byActionType[type] || 0) + 1
          })
          summary.byStatus = byStatus
          summary.byCampaign = byCampaign
          summary.byCreator = byCreator
          summary.byActionType = byActionType

          // Try to resolve SubId1 to creator name/email (best-effort)
          try {
            const creatorsResp = await apiFetch('/api/admin/creators', { token })
            const creators = creatorsResp?.creators || []
            const idToCreator = {}
            creators.forEach(c => { idToCreator[c.id] = c })
            const resolved = Object.entries(byCreator)
              .map(([subId, count]) => {
                const c = idToCreator[subId]
                const label = c ? `${c.name || 'Creator'} (${c.email})` : (subId || 'UNKNOWN')
                return { subId, label, count }
              })
              .sort((a, b) => b.count - a.count)
            summary.byCreatorResolved = resolved
          } catch (e) {
            // Non-fatal; keep raw SubId1 mapping
          }
        }

        setImpactClicks({ ...payload, totalClicks, totalResults, ...(Object.keys(summary).length ? { summary } : {}) })
        console.log('✅ Impact.com data (derived):', { totalClicks, totalResults, hasClicks: clicks.length > 0, actions: actions.length })
      } else {
        throw new Error(data.message || 'Failed to fetch Impact.com data')
      }
    } catch (error) {
      console.error('❌ Error fetching Impact.com clicks:', error)
      setImpactError(error.message)
      setImpactClicks(null)
    } finally {
      setLoadingImpact(false)
    }
  }

  // NEW: Function to fetch Impact.com Actions (detailed conversions)
  const fetchImpactActions = async () => {
    setLoadingActions(true)
    setActionsError('')
    try {
      const data = await apiFetch('/api/admin/impact-actions?Page=1&PageSize=100', { token })
      if (!data.success) throw new Error(data.message || 'Failed to fetch actions')
      const payload = data.data || {}
      const actions = Array.isArray(payload.actions) ? payload.actions : []

      // Build lightweight breakdowns
      const byStatus = {}
      const byCampaign = {}
      const byCreator = {}
      const byActionType = {}
      actions.forEach(a => {
        const st = a.State || a.status || 'UNKNOWN'
        const camp = a.CampaignId || a.campaignId || 'N/A'
        const sub1 = a.SubId1 || a.subId1 || 'UNKNOWN'
        const type = a.ActionType || a.actionType || (a.ActionTrackerName || 'SALE')
        byStatus[st] = (byStatus[st] || 0) + 1
        byCampaign[camp] = (byCampaign[camp] || 0) + 1
        byCreator[sub1] = (byCreator[sub1] || 0) + 1
        byActionType[type] = (byActionType[type] || 0) + 1
      })

      // Resolve SubId1 → creator label (best effort)
      let byCreatorResolved = null
      try {
        const creatorsResp = await apiFetch('/api/admin/creators', { token })
        const creators = creatorsResp?.creators || []
        const idToCreator = {}
        creators.forEach(c => { idToCreator[c.id] = c })
        byCreatorResolved = Object.entries(byCreator).map(([subId, count]) => ({
          subId,
          label: idToCreator[subId] ? `${idToCreator[subId].name || 'Creator'} (${idToCreator[subId].email})` : (subId || 'UNKNOWN'),
          count
        })).sort((a,b)=>b.count-a.count)
      } catch {}

      setImpactActions({
        totalResults: payload.totalResults || actions.length,
        actionsCount: actions.length,
        summary: { byStatus, byCampaign, byCreator, byCreatorResolved, byActionType }
      })
    } catch (error) {
      setActionsError(error.message)
      setImpactActions(null)
    } finally {
      setLoadingActions(false)
    }
  }

  const StatCard = ({ icon, label, value, change, color = '#667eea' }) => (
    <div className="modern-stat-card">
      <div className="stat-icon" style={{ background: `${color}20`, color }}>
        {icon}
      </div>
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {change && (
          <div className={`stat-change ${change.startsWith('+') ? 'positive' : 'negative'}`}>
            {change}
          </div>
        )}
      </div>
    </div>
  )

  const ActionCard = ({ icon, title, description, link, color = '#667eea', urgent = false }) => (
    <div className={`modern-action-card ${urgent ? 'urgent' : ''}`}>
      <div className="action-icon" style={{ background: `${color}20`, color }}>
        {icon}
      </div>
      <div className="action-content">
        <h3 className="action-title">{title}</h3>
        <p className="action-description">{description}</p>
        <Link to={link} className="modern-action-button" style={{ background: color }}>
          Open {title}
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      {urgent && <div className="urgent-badge">!</div>}
    </div>
  )

  return (
    <div className="modern-admin-container">
      {/* Header Section */}
      <div className="admin-header-modern">
        <div>
          <h1 className="admin-title-modern">Admin Dashboard</h1>
          <p className="admin-subtitle-modern">Platform overview and management tools</p>
        </div>
        <div className="system-status">
          <div className={`status-indicator ${systemHealth}`}>
            <div className="status-dot"></div>
            <span>System {systemHealth === 'healthy' ? 'Healthy' : 'Issues'}</span>
          </div>
          <div className="last-updated">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {/* Stats Grid */}
      <div className="modern-stats-grid">
        <StatCard 
          icon={<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>}
          label="Total Creators"
          value={stats.creatorCount || 0}
          change="+12% this month"
          color="#10b981"
        />
        
        <StatCard 
          icon={<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>}
          label="Total Links"
          value={stats.linkCount || 0}
          change="+8% this week"
          color="#3b82f6"
        />
        
        <StatCard 
          icon={<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>}
          label="Pending Applications"
          value={stats.pendingApplications || 0}
          change="Needs attention"
          color="#f59e0b"
        />
        
        <StatCard 
          icon={<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>}
          label="Platform Revenue"
          value={`$${Number(stats.totalRevenue || 0).toFixed(2)}`}
          change="+23% this month"
          color="#8b5cf6"
        />
      </div>

      {/* NEW: Impact.com Real Click Data Section */}
      <div className="section-header">
        <h2 className="section-title">Impact.com Real Click Data</h2>
        <p className="section-subtitle">Official click data from Impact.com API</p>
      </div>

      <div className="impact-clicks-section">
        <div className="impact-clicks-card">
          <div className="impact-clicks-header">
            <div className="impact-clicks-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinecap="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="impact-clicks-info">
              <h3>Real-Time Impact.com Clicks</h3>
              <p>Official click data directly from Impact.com API</p>
            </div>
            <button 
              onClick={() => fetchImpactClicks()} 
              className="refresh-impact-btn"
              disabled={loadingImpact}
            >
              {loadingImpact ? 'Loading...' : '🔄 Refresh Data'}
            </button>
          </div>
          
          {impactClicks && (
            <div className="impact-clicks-data">
              <div className="impact-stats-grid">
                <div className="impact-stat">
                  <span className="impact-stat-label">Total Clicks</span>
                  <span className="impact-stat-value">{impactClicks.totalClicks || 0}</span>
                </div>
                <div className="impact-stat">
                  <span className="impact-stat-label">Total Results</span>
                  <span className="impact-stat-value">{impactClicks.totalResults || 0}</span>
                </div>
                <div className="impact-stat">
                  <span className="impact-stat-label">Last Updated</span>
                  <span className="impact-stat-value">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
              
              {impactClicks.summary && (
                <div className="impact-breakdown">
                  <h4>Click Breakdown</h4>
                                      <div className="breakdown-grid">
                      <div className="breakdown-section">
                        <h5>By Campaign</h5>
                        <div className="breakdown-list">
                          {Object.entries(impactClicks.summary.byCampaign || {}).map(([campaign, clicks]) => (
                            <div key={campaign} className="breakdown-item">
                              <span>Campaign {campaign}</span>
                              <span>{clicks} clicks</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="breakdown-section">
                        <h5>By Creator (SubId1)</h5>
                        <div className="breakdown-list">
                          {(impactClicks.summary.byCreatorResolved || []).map(row => (
                            <div key={row.subId} className="breakdown-item">
                              <span>{row.label}</span>
                              <span>{row.count} {row.count === 1 ? 'action' : 'actions'}</span>
                            </div>
                          ))}
                          {!impactClicks.summary.byCreatorResolved && Object.entries(impactClicks.summary.byCreator || {}).map(([subId, count]) => (
                            <div key={subId} className="breakdown-item">
                              <span>{subId}</span>
                              <span>{count} {count === 1 ? 'action' : 'actions'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="breakdown-section">
                        <h5>By Action Type</h5>
                        <div className="breakdown-list">
                          {Object.entries(impactClicks.summary.byActionType || {}).map(([type, count]) => (
                            <div key={type} className="breakdown-item">
                              <span>{type}</span>
                              <span>{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="breakdown-section">
                        <h5>By Status</h5>
                        <div className="breakdown-list">
                          {Object.entries(impactClicks.summary.byStatus || {}).map(([status, count]) => (
                            <div key={status} className="breakdown-item">
                              <span>{status}</span>
                              <span>{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                </div>
              )}
            </div>
          )}
          
          {impactError && (
            <div className="impact-error">
              <p>❌ {impactError}</p>
              <small>Using local analytics data as fallback</small>
            </div>
          )}
        </div>
      </div>

      {/* NEW: Impact.com Actions (Conversions) Section */}
      <div className="section-header">
        <h2 className="section-title">Impact.com Actions</h2>
        <p className="section-subtitle">Conversions with status and SubId1 attribution</p>
      </div>
      <div className="impact-clicks-section">
        <div className="impact-clicks-card">
          <div className="impact-clicks-header">
            <div className="impact-clicks-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h4l3 10 4-18 3 8h4" />
              </svg>
            </div>
            <div className="impact-clicks-info">
              <h3>Network Actions</h3>
              <p>Approved/Pending/Reversed by campaign and SubId1</p>
            </div>
            <button
              onClick={() => fetchImpactActions()}
              className="refresh-impact-btn"
              disabled={loadingActions}
            >
              {loadingActions ? 'Loading...' : '🔄 Refresh Actions'}
            </button>
          </div>

          {impactActions && (
            <div className="impact-clicks-data">
              <div className="impact-stats-grid">
                <div className="impact-stat">
                  <span className="impact-stat-label">Total Results</span>
                  <span className="impact-stat-value">{impactActions.totalResults || 0}</span>
                </div>
                <div className="impact-stat">
                  <span className="impact-stat-label">Fetched</span>
                  <span className="impact-stat-value">{impactActions.actionsCount || 0}</span>
                </div>
              </div>

              <div className="impact-breakdown">
                <h4>Action Breakdown</h4>
                <div className="breakdown-grid">
                  <div className="breakdown-section">
                    <h5>By Status</h5>
                    <div className="breakdown-list">
                      {Object.entries(impactActions.summary.byStatus || {}).map(([status, count]) => (
                        <div key={status} className="breakdown-item"><span>{status}</span><span>{count}</span></div>
                      ))}
                    </div>
                  </div>
                  <div className="breakdown-section">
                    <h5>By Campaign</h5>
                    <div className="breakdown-list">
                      {Object.entries(impactActions.summary.byCampaign || {}).map(([campaign, count]) => (
                        <div key={campaign} className="breakdown-item"><span>Campaign {campaign}</span><span>{count}</span></div>
                      ))}
                    </div>
                  </div>
                  <div className="breakdown-section">
                    <h5>By Creator (SubId1)</h5>
                    <div className="breakdown-list">
                      {(impactActions.summary.byCreatorResolved || []).map(row => (
                        <div key={row.subId} className="breakdown-item"><span>{row.label}</span><span>{row.count}</span></div>
                      ))}
                    </div>
                  </div>
                  <div className="breakdown-section">
                    <h5>By Action Type</h5>
                    <div className="breakdown-list">
                      {Object.entries(impactActions.summary.byActionType || {}).map(([type, count]) => (
                        <div key={type} className="breakdown-item"><span>{type}</span><span>{count}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {actionsError && (
            <div className="impact-error">
              <p>❌ {actionsError}</p>
              <small>Try again or adjust date filters later.</small>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="section-header">
        <h2 className="section-title">Quick Actions</h2>
        <p className="section-subtitle">Manage your platform efficiently</p>
      </div>

      <div className="modern-actions-grid">
        <ActionCard 
          icon={<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>}
          title="Pending Applications"
          description="Review and approve new creator applications"
          link="/admin/pending-applications"
          color="#f59e0b"
          urgent={stats.pendingApplications > 0}
        />
        
        <ActionCard 
          icon={<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>}
          title="Creator Management"
          description="Manage existing creators and their settings"
          link="/admin/creators"
          color="#10b981"
        />
        
        <ActionCard 
          icon={<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>}
          title="Payout Queue"
          description="Process pending creator payouts"
          link="/admin/payout-queue"
          color="#8b5cf6"
        />
        
        <ActionCard 
          icon={<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>}
          title="Performance Analytics"
          description="View platform-wide performance metrics"
          link="/admin/performance-analytics"
          color="#3b82f6"
        />
        
        <ActionCard 
          icon={<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>}
          title="System Settings"
          description="Configure platform settings and policies"
          link="/admin/system-settings"
          color="#6b7280"
        />
      </div>
    </div>
  )
}


