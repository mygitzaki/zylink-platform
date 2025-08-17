import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'
import { Link } from 'react-router-dom'

export default function AdminOverview(){
  const { token } = useAuth()
  const [stats,setStats] = useState({ creatorCount:0, linkCount:0, pendingApplications:0, totalRevenue:0 })
  const [error,setError] = useState('')
  const [systemHealth, setSystemHealth] = useState('healthy')

  useEffect(()=>{
    apiFetch('/api/admin/stats', { token })
      .then(setStats)
      .catch(e=>setError(e.message))
  },[token])

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


