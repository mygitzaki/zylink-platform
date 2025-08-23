import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'

export default function CreatorManagement(){
  const { token } = useAuth()
  const [rows,setRows] = useState([])
  const [error,setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentAccounts, setPaymentAccounts] = useState([])
  const [showPaymentDetails, setShowPaymentDetails] = useState(null)
  const [showCreatorProfile, setShowCreatorProfile] = useState(null)
  const [creatorProfileData, setCreatorProfileData] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  const load = useCallback(async () => {
    try{ 
      const d = await apiFetch('/api/admin/creators',{ token }); 
      setRows(d.creators||[]) 
    }catch(e){ setError(e.message) }
  }, [token])

  const loadPaymentAccounts = useCallback(async () => {
    try{ 
      const d = await apiFetch('/api/admin/payment-accounts',{ token }); 
      setPaymentAccounts(d.paymentAccounts||[]) 
    }catch(e){ console.error('Failed to load payment accounts:', e.message) }
  }, [token])
  
  useEffect(()=>{ 
    load() 
    loadPaymentAccounts()
  },[load, loadPaymentAccounts])

  async function setStatus(id,isActive){ 
    await apiFetch(`/api/admin/creators/${id}/status`,{ method:'PUT', token, body:{ isActive } }); 
    await load() 
  }
  
  async function setCommission(id,commissionRate){ 
    await apiFetch(`/api/admin/creators/${id}/commission`,{ method:'PUT', token, body:{ commissionRate } }); 
    await load() 
  }

  const getCreatorPaymentDetails = (creatorId) => {
    return paymentAccounts.find(account => account.creatorId === creatorId)
  }

  const loadCreatorProfile = async (creatorId) => {
    try {
      console.log('🔍 Loading creator profile for:', creatorId)
      setLoadingProfile(true)
      setError('') // Clear any previous errors
      
      const data = await apiFetch(`/api/admin/creators/${creatorId}/profile`, { 
        method: 'GET',
        token 
      })
      
      console.log('✅ Profile data received:', data)
      
      if (!data || !data.creator) {
        throw new Error('Invalid profile data received')
      }
      
      setCreatorProfileData(data)
      setShowCreatorProfile(creatorId)
      console.log('🎯 Modal should now show for:', data.creator.name)
      
    } catch (error) {
      console.error('❌ Failed to load creator profile:', error)
      setError(`Failed to load creator profile: ${error.message}`)
    } finally {
      setLoadingProfile(false)
    }
  }

  const filteredRows = rows.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const CreatorCard = ({ creator }) => {
    const paymentDetails = getCreatorPaymentDetails(creator.id)
    
    return (
      <div className="creator-card" onClick={() => {
        console.log('Creator card clicked:', creator.id, creator.name)
        loadCreatorProfile(creator.id)
      }} style={{cursor: 'pointer'}}>
        <div className="creator-info">
          <div className="creator-avatar">
            {creator.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="creator-details">
            <h3 className="creator-name">{creator.name}</h3>
            <p className="creator-email">{creator.email}</p>
            <div className="creator-meta">
              <span className={`status-badge ${creator.isActive ? 'active' : 'inactive'}`}>
                {creator.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className="commission-badge">
                {creator.commissionRate}% Commission
              </span>
              <span className={`payment-badge ${paymentDetails ? 'submitted' : 'missing'}`}>
                {paymentDetails ? `💳 ${paymentDetails.type}` : '❌ No Payment Info'}
              </span>
              <span className="subid-badge" title="Impact SubId1 used for tracking">
                SubId1: {creator.id}
              </span>
            </div>
            
            {/* Performance Metrics */}
            <div className="creator-performance">
              <div className="performance-metric">
                <span className="metric-label">Clicks:</span>
                <span className="metric-value">{creator.performance?.totalClicks || 0}</span>
              </div>
              <div className="performance-metric">
                <span className="metric-label">Links:</span>
                <span className="metric-value">{creator.performance?.totalLinks || 0}</span>
              </div>
              <div className="performance-metric">
                <span className="metric-label">Revenue:</span>
                <span className="metric-value">${(creator.performance?.totalRevenue || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      
        <div className="creator-actions">
          <button 
            onClick={(e) => { e.stopPropagation(); setStatus(creator.id, !creator.isActive) }}
            className={`action-btn ${creator.isActive ? 'deactivate' : 'activate'}`}
          >
            {creator.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation()
              const v = prompt('Enter commission percentage:', creator.commissionRate); 
              if(v && !isNaN(v)) setCommission(creator.id, Number(v))
            }}
            className="action-btn commission"
          >
            Set Commission
          </button>
          <div className="view-profile-hint">
            <span>👆 Click anywhere to view full profile</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modern-admin-container">
      <div className="admin-header-modern">
        <div>
          <h1 className="admin-title-modern">Creator Management</h1>
          <p className="admin-subtitle-modern">Manage all platform creators and their settings</p>
        </div>
        <div className="header-stats">
          <div className="stat-mini">
            <span className="stat-mini-value">{rows.length}</span>
            <span className="stat-mini-label">Total Creators</span>
          </div>
          <div className="stat-mini">
            <span className="stat-mini-value">{rows.filter(r => r.isActive).length}</span>
            <span className="stat-mini-label">Active</span>
          </div>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="page-controls">
        <div className="search-box">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search creators by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="creators-grid">
        {filteredRows.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3>No creators found</h3>
            <p>No creators match your search criteria.</p>
          </div>
        ) : (
          filteredRows.map(creator => (
            <CreatorCard key={creator.id} creator={creator} />
          ))
        )}
      </div>

      {/* Payment Details Modal */}
      {showPaymentDetails && (
        <div className="modal-overlay" onClick={() => setShowPaymentDetails(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💳 Payment Details</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowPaymentDetails(null)}
              >
                ×
              </button>
            </div>
            
            {(() => {
              const creator = rows.find(r => r.id === showPaymentDetails)
              const paymentDetails = getCreatorPaymentDetails(showPaymentDetails)
              
              if (!creator || !paymentDetails) return <div>Payment details not found</div>
              
              return (
                <div className="modal-body">
                  <div className="payment-info-section">
                    <h3>Creator Information</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="label">Name:</span>
                        <span className="value">{creator.name}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Email:</span>
                        <span className="value">{creator.email}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Commission:</span>
                        <span className="value">{creator.commissionRate}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="payment-info-section">
                    <h3>Payment Method: {paymentDetails.type}</h3>
                    <div className="payment-details-grid">
                      {paymentDetails.type === 'Bank Transfer' && (
                        <>
                          <div className="info-item">
                            <span className="label">Account Name:</span>
                            <span className="value">{paymentDetails.accountDetails.accountName || 'N/A'}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Account Number:</span>
                            <span className="value">{paymentDetails.accountDetails.accountNumber || 'N/A'}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Routing Number:</span>
                            <span className="value">{paymentDetails.accountDetails.routingNumber || 'N/A'}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Bank Name:</span>
                            <span className="value">{paymentDetails.accountDetails.bankName || 'N/A'}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">SWIFT Code:</span>
                            <span className="value">{paymentDetails.accountDetails.swiftCode || 'N/A'}</span>
                          </div>
                        </>
                      )}
                      
                      {paymentDetails.type === 'PayPal' && (
                        <div className="info-item">
                          <span className="label">PayPal Email:</span>
                          <span className="value">{paymentDetails.accountDetails.email || 'N/A'}</span>
                        </div>
                      )}
                      
                      {paymentDetails.type === 'Cryptocurrency' && (
                        <>
                          <div className="info-item">
                            <span className="label">Currency:</span>
                            <span className="value">{paymentDetails.accountDetails.currency || 'N/A'}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Wallet Address:</span>
                            <span className="value" style={{wordBreak: 'break-all'}}>{paymentDetails.accountDetails.address || 'N/A'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="payment-info-section">
                    <h3>Submission Details</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="label">Submitted:</span>
                        <span className="value">{new Date(paymentDetails.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Last Updated:</span>
                        <span className="value">{new Date(paymentDetails.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Status:</span>
                        <span className={`value ${paymentDetails.isVerified ? 'verified' : 'unverified'}`}>
                          {paymentDetails.isVerified ? '✅ Verified' : '⏳ Pending Verification'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Comprehensive Creator Profile Modal */}
      {(() => {
        console.log('🎬 Modal render check:', {
          showCreatorProfile,
          hasCreatorProfileData: !!creatorProfileData,
          creatorName: creatorProfileData?.creator?.name
        })
        return showCreatorProfile && creatorProfileData
      })() && (
        <div className="modal-overlay" onClick={() => setShowCreatorProfile(null)}>
          <div className="modal-content creator-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👤 Creator Profile: {creatorProfileData.creator.name}</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowCreatorProfile(null)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body creator-profile-body">
              {/* Personal Information */}
              <div className="profile-section">
                <h3>📋 Personal Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Name:</span>
                    <span className="value">{creatorProfileData.creator.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Email:</span>
                    <span className="value">{creatorProfileData.creator.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Status:</span>
                    <span className={`value ${creatorProfileData.creator.isActive ? 'active' : 'inactive'}`}>
                      {creatorProfileData.creator.isActive ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Application Status:</span>
                    <span className="value">{creatorProfileData.creator.applicationStatus || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Commission Rate:</span>
                    <span className="value">{creatorProfileData.creator.commissionRate}%</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Impact SubId1:</span>
                    <span className="value" style={{wordBreak:'break-all'}}>{creatorProfileData.creator.id}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Referral Code:</span>
                    <span className="value">{creatorProfileData.creator.referralCode || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Joined Date:</span>
                    <span className="value">{new Date(creatorProfileData.creator.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {/* Bio Section */}
                {creatorProfileData.creator.bio && (
                  <div className="bio-section">
                    <h4>📝 Bio</h4>
                    <p className="bio-text">{creatorProfileData.creator.bio}</p>
                  </div>
                )}
                
                {/* Application Notes */}
                {(creatorProfileData.creator.applicationNotes || creatorProfileData.creator.rejectionReason) && (
                  <div className="notes-section">
                    <h4>📝 Application Notes</h4>
                    {creatorProfileData.creator.applicationNotes && (
                      <div className="note-item">
                        <span className="note-label">Admin Notes:</span>
                        <p className="note-text">{creatorProfileData.creator.applicationNotes}</p>
                      </div>
                    )}
                    {creatorProfileData.creator.rejectionReason && (
                      <div className="note-item rejection">
                        <span className="note-label">Rejection Reason:</span>
                        <p className="note-text">{creatorProfileData.creator.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Social Media & Links */}
              {(creatorProfileData.creator.socialMediaLinks || creatorProfileData.creator.groupLinks) && (
                <div className="profile-section">
                  <h3>🔗 Social Media & Links</h3>
                  
                  {/* Social Media Links */}
                  {creatorProfileData.creator.socialMediaLinks && (
                    <div className="links-subsection">
                      <h4>📱 Social Media Accounts</h4>
                      <div className="links-grid">
                        {Object.entries(creatorProfileData.creator.socialMediaLinks).map(([platform, url]) => (
                          url && (
                            <div key={platform} className="link-item">
                              <div className="link-info">
                                <span className="link-platform">{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="link-url">
                                  {url}
                                </a>
                              </div>
                              <div className="link-icon">🔗</div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Group/Website Links */}
                  {creatorProfileData.creator.groupLinks && (
                    <div className="links-subsection">
                      <h4>🌐 Websites & Groups</h4>
                      <div className="links-grid">
                        {Object.entries(creatorProfileData.creator.groupLinks).map(([type, url]) => (
                          url && (
                            <div key={type} className="link-item">
                              <div className="link-info">
                                <span className="link-platform">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="link-url">
                                  {url}
                                </a>
                              </div>
                              <div className="link-icon">🌐</div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Performance Metrics - Only show if data exists */}
              {creatorProfileData.performance && (
                <div className="profile-section">
                  <h3>📊 Performance Metrics</h3>
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <div className="metric-value">${(creatorProfileData.performance.totalEarnings || 0).toFixed(2)}</div>
                      <div className="metric-label">Total Earnings</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">${(creatorProfileData.performance.totalReferralEarnings || 0).toFixed(2)}</div>
                      <div className="metric-label">Referral Earnings</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">{creatorProfileData.performance.totalClicks || 0}</div>
                      <div className="metric-label">Total Clicks</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">{creatorProfileData.performance.totalConversions || 0}</div>
                      <div className="metric-label">Conversions</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">{(creatorProfileData.performance.conversionRate || 0).toFixed(1)}%</div>
                      <div className="metric-label">Conversion Rate</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">{creatorProfileData.performance.linksCount || 0}</div>
                      <div className="metric-label">Active Links</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Information */}
              <div className="profile-section">
                <h3>💳 Payment Information</h3>
                {creatorProfileData.paymentDetails ? (
                  <div>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="label">Payment Method:</span>
                        <span className="value">{creatorProfileData.paymentDetails.type || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Status:</span>
                        <span className={`value ${creatorProfileData.paymentDetails.isVerified ? 'verified' : 'unverified'}`}>
                          {creatorProfileData.paymentDetails.isVerified ? '✅ Verified' : '⏳ Pending'}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="label">Submitted:</span>
                        <span className="value">{creatorProfileData.paymentDetails.createdAt ? new Date(creatorProfileData.paymentDetails.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>

                    {/* Payment Method Details */}
                    <div className="payment-details-section">
                      <h4>Account Details:</h4>
                      <div className="payment-details-grid">
                        {creatorProfileData.paymentDetails.type === 'Bank Transfer' && (
                          <>
                            <div className="info-item">
                              <span className="label">Account Name:</span>
                              <span className="value">{creatorProfileData.paymentDetails.accountDetails.accountName || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                              <span className="label">Account Number:</span>
                              <span className="value">{creatorProfileData.paymentDetails.accountDetails.accountNumber || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                              <span className="label">Routing Number:</span>
                              <span className="value">{creatorProfileData.paymentDetails.accountDetails.routingNumber || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                              <span className="label">Bank Name:</span>
                              <span className="value">{creatorProfileData.paymentDetails.accountDetails.bankName || 'N/A'}</span>
                            </div>
                          </>
                        )}
                        
                        {creatorProfileData.paymentDetails.type === 'PayPal' && (
                          <div className="info-item">
                            <span className="label">PayPal Email:</span>
                            <span className="value">{creatorProfileData.paymentDetails.accountDetails.email || 'N/A'}</span>
                          </div>
                        )}
                        
                        {creatorProfileData.paymentDetails.type === 'Cryptocurrency' && (
                          <>
                            <div className="info-item">
                              <span className="label">Currency:</span>
                              <span className="value">{creatorProfileData.paymentDetails.accountDetails.currency || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                              <span className="label">Wallet Address:</span>
                              <span className="value" style={{wordBreak: 'break-all'}}>{creatorProfileData.paymentDetails.accountDetails.address || 'N/A'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="no-payment-info">
                    <p>❌ No payment information submitted</p>
                  </div>
                )}
              </div>

              {/* Recent Activity - Only show if data exists */}
              {creatorProfileData.recentLinks && (
                <div className="profile-section">
                  <h3>🔗 Recent Links ({creatorProfileData.recentLinks.length || 0})</h3>
                  {creatorProfileData.recentLinks.length > 0 ? (
                    <div className="recent-links-list">
                      {creatorProfileData.recentLinks.slice(0, 5).map(link => (
                        <div key={link.id} className="link-item">
                          <div className="link-info">
                            <div className="link-title">{link.title || 'Untitled Link'}</div>
                            <div className="link-url">{link.destinationUrl}</div>
                          </div>
                          <div className="link-stats">
                            <span>{link.clicks || 0} clicks</span>
                            <span>{link.conversions || 0} conversions</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No links created yet</p>
                  )}
                </div>
              )}

              {/* Recent Earnings - Only show if data exists */}
              {creatorProfileData.recentEarnings && (
                <div className="profile-section">
                  <h3>💰 Recent Earnings ({creatorProfileData.recentEarnings.length || 0})</h3>
                  {creatorProfileData.recentEarnings.length > 0 ? (
                    <div className="recent-earnings-list">
                      {creatorProfileData.recentEarnings.slice(0, 5).map(earning => (
                        <div key={earning.id} className="earning-item">
                          <div className="earning-info">
                            <div className="earning-amount">${Number(earning.amount || 0).toFixed(2)}</div>
                            <div className="earning-type">{earning.type || 'Unknown'}</div>
                          </div>
                          <div className="earning-date">
                            {earning.createdAt ? new Date(earning.createdAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No earnings yet</p>
                  )}
                </div>
              )}

              {/* Referrals - Only show if data exists */}
              {creatorProfileData.referrals && creatorProfileData.referrals.length > 0 && (
                <div className="profile-section">
                  <h3>👥 Referrals ({creatorProfileData.referrals.length})</h3>
                  <div className="referrals-list">
                    {creatorProfileData.referrals.map(referral => (
                      <div key={referral.id} className="referral-item">
                        <span>{referral.referred.name}</span>
                        <span>{referral.referred.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Message */}
              {(!creatorProfileData.performance && !creatorProfileData.recentLinks && !creatorProfileData.recentEarnings && !creatorProfileData.referrals) && (
                <div className="profile-section info-message">
                  <h3>ℹ️ Profile Information</h3>
                  <p>This creator has a basic profile. Performance metrics and activity data will appear here once they start using the platform.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Profile Modal */}
      {loadingProfile && (
        <div className="modal-overlay">
          <div className="modal-content loading-modal">
            <div className="loading-content">
              <div className="spinner"></div>
              <p>Loading creator profile...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
