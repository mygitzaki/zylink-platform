import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'

export default function PendingApplications(){
  const { token } = useAuth()
  const [rows,setRows] = useState([])
  const [error,setError] = useState('')
  const [success,setSuccess] = useState('')
  const [selectedApp, setSelectedApp] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchRows = useCallback(async () => {
    try {
      const d = await apiFetch('/api/admin/applications/pending', { token })
      setRows(d.creators||[])
    } catch(e){ setError(e.message) }
  }, [token])

  useEffect(()=>{ fetchRows() },[fetchRows])

  async function review(id, status){
    console.log('Review function called:', { id, status })
    setLoading(true)
    try {
      const result = await apiFetch(`/api/admin/applications/${id}/review`, { method:'PUT', token, body: { status } })
      console.log('Review result:', result)
      
      // Set success message based on status
      if (status === 'APPROVED') {
        setSuccess('Application approved successfully!')
      } else if (status === 'REJECTED') {
        setSuccess('Application rejected successfully!')
      } else if (status === 'CHANGES_REQUESTED') {
        setSuccess('Changes requested successfully!')
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
      
      await fetchRows()
      setSelectedApp(null)
    } catch (error) {
      console.error('Review error:', error)
      setError(error.message)
      // Clear error after 5 seconds
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const ApplicationCard = ({ application }) => (
    <div className="application-card">
      <div className="application-header">
        <div className="applicant-info">
          <div className="applicant-avatar">
            {application.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="applicant-name">{application.name}</h3>
            <p className="applicant-email">{application.email}</p>
            <span className="application-date">
              Applied {new Date(application.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <button 
          onClick={() => setSelectedApp(selectedApp === application.id ? null : application.id)}
          className="expand-btn"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={selectedApp === application.id ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
          </svg>
        </button>
      </div>

      {selectedApp === application.id && (
        <div className="application-details">
          <div className="detail-section">
            <h4>Bio</h4>
            <p>{application.bio || 'No bio provided'}</p>
          </div>
          
          {application.socialMediaLinks && (
            <div className="detail-section">
              <h4>Social Media Links</h4>
              <div className="social-links">
                {Object.entries(application.socialMediaLinks).map(([platform, link]) => (
                  <a key={platform} href={link} target="_blank" rel="noopener noreferrer" className="social-link">
                    {platform}: {link}
                  </a>
                ))}
              </div>
            </div>
          )}
          
          {application.groupLinks && (
            <div className="detail-section">
              <h4>Website/Group Links</h4>
              <div className="group-links">
                {Object.entries(application.groupLinks).map(([type, link]) => (
                  <a key={type} href={link} target="_blank" rel="noopener noreferrer" className="group-link">
                    {type}: {link}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="application-actions">
        <button 
          onClick={() => {
            console.log('Approve button clicked for:', application.id)
            review(application.id, 'APPROVED')
          }}
          className="action-btn approve"
          disabled={loading}
        >
          {loading ? (
            <svg className="animate-spin" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {loading ? 'Processing...' : 'Approve'}
        </button>
        <button 
          onClick={() => review(application.id, 'CHANGES_REQUESTED')}
          className="action-btn changes"
          disabled={loading}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Request Changes
        </button>
        <button 
          onClick={() => review(application.id, 'REJECTED')}
          className="action-btn reject"
          disabled={loading}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reject
        </button>
      </div>
    </div>
  )

  return (
    <div className="modern-admin-container">
      <div className="admin-header-modern">
        <div>
          <h1 className="admin-title-modern">Pending Applications</h1>
          <p className="admin-subtitle-modern">Review and approve new creator applications</p>
        </div>
        <div className="header-stats">
          <div className="stat-mini urgent">
            <span className="stat-mini-value">{rows.length}</span>
            <span className="stat-mini-label">Pending Review</span>
          </div>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="applications-container">
        {rows.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3>No pending applications</h3>
            <p>All applications have been reviewed.</p>
          </div>
        ) : (
          <div className="applications-grid">
            {rows.map(application => (
              <ApplicationCard key={application.id} application={application} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}




