import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'

export default function MyLinks() {
  const { token } = useAuth()
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLinks, setSelectedLinks] = useState([])
  const [sortBy, setSortBy] = useState('created')

  useEffect(() => {
    let alive = true
    setLoading(true)
    apiFetch('/api/creator/links', { token })
      .then(d => alive && setLinks(d.links || []))
      .catch(e => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [token])

  const filteredLinks = links
    .filter(link => 
      link.destinationUrl?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.shortLink?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch(sortBy) {
        case 'clicks': return (b.clicks || 0) - (a.clicks || 0)
        case 'revenue': return (b.revenue || 0) - (a.revenue || 0)
        case 'conversions': return (b.conversions || 0) - (a.conversions || 0)
        default: return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      }
    })

  const toggleSelectLink = (linkId) => {
    setSelectedLinks(prev => 
      prev.includes(linkId) 
        ? prev.filter(id => id !== linkId)
        : [...prev, linkId]
    )
  }

  const selectAllLinks = () => {
    setSelectedLinks(selectedLinks.length === filteredLinks.length ? [] : filteredLinks.map(l => l.id))
  }

  const LinkCard = ({ link, isSelected, onSelect }) => {
    const conversionRate = link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : 0
    
    return (
      <div className={`link-card ${isSelected ? 'selected' : ''}`}>
        <div className="link-card-header">
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={() => onSelect(link.id)}
            className="link-checkbox"
          />
          <div className="link-status">
            <span className={`status-dot ${link.isActive ? 'active' : 'inactive'}`}></span>
            {link.isActive ? 'Active' : 'Inactive'}
          </div>
          <div className="link-actions">
            <button className="action-btn-small edit">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button className="action-btn-small delete">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <div className="link-info">
          
          <div className="link-variations">
            <div className="link-variation">
              <label>Short Link</label>
              <div className="link-copy-group">
                <span className="link-text">{link.shortLink}</span>
                <button onClick={() => {
                  navigator.clipboard.writeText(link.shortLink);
                  // Quick visual feedback
                  const btn = event.target.closest('button');
                  btn.style.background = '#10B981';
                  btn.innerHTML = '✓';
                  setTimeout(() => {
                    btn.style.background = '';
                    btn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>`;
                  }, 1000);
                }} className="copy-btn">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="link-variation">
              <label>Long Link</label>
              <div className="link-copy-group">
                <span className="link-text">{link.impactLink}</span>
                <button onClick={() => {
                  navigator.clipboard.writeText(link.impactLink);
                  // Quick visual feedback
                  const btn = event.target.closest('button');
                  btn.style.background = '#10B981';
                  btn.innerHTML = '✓';
                  setTimeout(() => {
                    btn.style.background = '';
                    btn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>`;
                  }, 1000);
                }} className="copy-btn">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="link-analytics">
          <div className="analytics-grid">
            <div className="metric">
              <span className="metric-value">{link.clicks || 0}</span>
              <span className="metric-label">Clicks</span>
            </div>
            <div className="metric">
              <span className="metric-value">{link.conversions || 0}</span>
              <span className="metric-label">Conversions</span>
            </div>
            <div className="metric">
              <span className="metric-value">{conversionRate}%</span>
              <span className="metric-label">CVR</span>
            </div>
            <div className="metric">
              <span className="metric-value">${Number(link.revenue || 0).toFixed(2)}</span>
              <span className="metric-label">Revenue</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">My Links</h1>
        <p className="dashboard-subtitle">Manage and track all your created affiliate links</p>
      </div>

      <div className="page-controls">
        <div className="search-box">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search links by URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-controls">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="created">Sort by Created</option>
            <option value="clicks">Sort by Clicks</option>
            <option value="revenue">Sort by Revenue</option>
            <option value="conversions">Sort by Conversions</option>
          </select>
        </div>
      </div>

      {selectedLinks.length > 0 && (
        <div className="bulk-actions">
          <span className="bulk-selected">{selectedLinks.length} links selected</span>
          <div className="bulk-buttons">
            <button className="bulk-btn activate">Activate Selected</button>
            <button className="bulk-btn deactivate">Deactivate Selected</button>
            <button className="bulk-btn delete">Delete Selected</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          Loading your links...
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {!loading && filteredLinks.length === 0 && (
        <div className="empty-state">
          <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h3>No links found</h3>
          <p>Create your first affiliate link to get started!</p>
        </div>
      )}

      {!loading && filteredLinks.length > 0 && (
        <div className="links-container">
          <div className="links-header">
            <label className="select-all">
              <input 
                type="checkbox" 
                checked={selectedLinks.length === filteredLinks.length}
                onChange={selectAllLinks}
                className="link-checkbox"
              />
              Select All ({filteredLinks.length} links)
            </label>
          </div>

          <div className="links-grid">
            {filteredLinks.map(link => (
              <LinkCard 
                key={link.id} 
                link={link}
                isSelected={selectedLinks.includes(link.id)}
                onSelect={toggleSelectLink}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}




