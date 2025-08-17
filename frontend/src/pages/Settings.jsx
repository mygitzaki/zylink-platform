import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'

export default function Settings(){
  const { token } = useAuth()
  const [profile,setProfile] = useState(null)
  const [name,setName] = useState('')
  const [bio,setBio] = useState('')
  const [email,setEmail] = useState('')
  const [social,setSocial] = useState({
    instagram: '',
    youtube: '',
    tiktok: '',
    website: ''
  })
  const [groups,setGroups] = useState({
    telegram: '',
    discord: '',
    whatsapp: ''
  })
  const [notifications, setNotifications] = useState({
    emailMarketing: true,
    emailPayments: true,
    emailAnalytics: false,
    pushMarketing: false,
    pushPayments: true
  })
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  })
  const [msg,setMsg] = useState('')
  const [error,setError] = useState('')
  const [activeTab, setActiveTab] = useState('profile')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(()=>{
    apiFetch('/api/creator/profile',{ token }).then(p=>{
      setProfile(p)
      setName(p.name||'')
      setBio(p.bio||'')
      setEmail(p.email||'')
      setSocial({
        instagram: p.socialMediaLinks?.instagram || '',
        youtube: p.socialMediaLinks?.youtube || '',
        tiktok: p.socialMediaLinks?.tiktok || '',
        website: p.socialMediaLinks?.website || ''
      })
      setGroups({
        telegram: p.groupLinks?.telegram || '',
        discord: p.groupLinks?.discord || '',
        whatsapp: p.groupLinks?.whatsapp || ''
      })
    }).catch(e=>setError(e.message))
  },[token])

  async function onSaveProfile(e){
    e.preventDefault(); setMsg(''); setError('')
    try{
      const socialMediaLinks = social
      const groupLinks = groups
      await apiFetch('/api/creator/profile',{ method:'PUT', token, body:{ name,bio,socialMediaLinks,groupLinks }})
      setMsg('Profile updated successfully')
    }catch(err){ setError(err.message||'Failed to update profile') }
  }

  async function onChangePassword(e){
    e.preventDefault(); setMsg(''); setError('')
    if(passwords.new !== passwords.confirm){
      setError('New passwords do not match')
      return
    }
    try{
      await apiFetch('/api/auth/change-password',{ method:'POST', token, body:{ 
        currentPassword: passwords.current,
        newPassword: passwords.new 
      }})
      setMsg('Password changed successfully')
      setPasswords({ current: '', new: '', confirm: '' })
    }catch(err){ setError(err.message||'Failed to change password') }
  }

  async function onUpdateNotifications(e){
    e.preventDefault(); setMsg(''); setError('')
    try{
      await apiFetch('/api/creator/notifications',{ method:'PUT', token, body: notifications })
      setMsg('Notification preferences updated')
    }catch(err){ setError(err.message||'Failed to update notifications') }
  }

  async function onDeleteAccount(){
    try{
      await apiFetch('/api/creator/account',{ method:'DELETE', token })
      // Redirect to login or show success message
      window.location.href = '/login'
    }catch(err){ setError(err.message||'Failed to delete account') }
  }

  const handleSocialChange = (platform, value) => {
    setSocial(prev => ({ ...prev, [platform]: value }))
  }

  const handleGroupChange = (platform, value) => {
    setGroups(prev => ({ ...prev, [platform]: value }))
  }

  const handleNotificationChange = (key, value) => {
    setNotifications(prev => ({ ...prev, [key]: value }))
  }

  const handlePasswordChange = (field, value) => {
    setPasswords(prev => ({ ...prev, [field]: value }))
  }

  if(!profile) return (
    <div className="dashboard-container">
      <div className="loading-state">
        <div className="loading-spinner"></div>
        Loading settings...
      </div>
    </div>
  )

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Settings</h1>
          <p className="dashboard-subtitle">Profile and account management</p>
        </div>
      </div>

      <div className="settings-tabs">
        <div className="tab-buttons">
          <button 
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button 
            className={`tab-button ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            Password
          </button>
          <button 
            className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
          </button>
          <button 
            className={`tab-button ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            Account
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'profile' && (
            <div className="profile-settings">
              <div className="section-header">
                <h2 className="section-title">Profile Editing</h2>
                <p className="section-subtitle">Update your personal information and links</p>
              </div>

              <form onSubmit={onSaveProfile} className="settings-form">
                <div className="form-section">
                  <h3>Basic Information</h3>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="form-input"
                        placeholder="Your full name"
                      />
                    </div>
                    
                    <div className="form-field">
                      <label>Email Address</label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="form-input disabled"
                        placeholder="your@email.com"
                      />
                      <small>Contact support to change your email</small>
                    </div>
                  </div>
                  
                  <div className="form-field">
                    <label>Bio</label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      className="form-textarea"
                      placeholder="Tell us about yourself..."
                      rows="4"
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h3>Social Media Links</h3>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Instagram</label>
                      <input
                        type="url"
                        value={social.instagram}
                        onChange={e => handleSocialChange('instagram', e.target.value)}
                        className="form-input"
                        placeholder="https://instagram.com/yourusername"
                      />
                    </div>
                    
                    <div className="form-field">
                      <label>YouTube</label>
                      <input
                        type="url"
                        value={social.youtube}
                        onChange={e => handleSocialChange('youtube', e.target.value)}
                        className="form-input"
                        placeholder="https://youtube.com/@yourusername"
                      />
                    </div>
                    
                    <div className="form-field">
                      <label>TikTok</label>
                      <input
                        type="url"
                        value={social.tiktok}
                        onChange={e => handleSocialChange('tiktok', e.target.value)}
                        className="form-input"
                        placeholder="https://tiktok.com/@yourusername"
                      />
                    </div>
                    
                    <div className="form-field">
                      <label>Website</label>
                      <input
                        type="url"
                        value={social.website}
                        onChange={e => handleSocialChange('website', e.target.value)}
                        className="form-input"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Group Links</h3>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Telegram</label>
                      <input
                        type="url"
                        value={groups.telegram}
                        onChange={e => handleGroupChange('telegram', e.target.value)}
                        className="form-input"
                        placeholder="https://t.me/yourgroup"
                      />
                    </div>
                    
                    <div className="form-field">
                      <label>Discord</label>
                      <input
                        type="url"
                        value={groups.discord}
                        onChange={e => handleGroupChange('discord', e.target.value)}
                        className="form-input"
                        placeholder="https://discord.gg/yourinvite"
                      />
                    </div>
                    
                    <div className="form-field">
                      <label>WhatsApp</label>
                      <input
                        type="url"
                        value={groups.whatsapp}
                        onChange={e => handleGroupChange('whatsapp', e.target.value)}
                        className="form-input"
                        placeholder="https://chat.whatsapp.com/yourinvite"
                      />
                    </div>
                  </div>
                </div>

                {msg && <div className="success-message">{msg}</div>}
                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="primary-btn">
                  Save Profile Changes
                </button>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="password-settings">
              <div className="section-header">
                <h2 className="section-title">Password Changes</h2>
                <p className="section-subtitle">Update your account password</p>
              </div>

              <form onSubmit={onChangePassword} className="settings-form">
                <div className="form-section">
                  <div className="form-field">
                    <label>Current Password</label>
                    <input
                      type="password"
                      value={passwords.current}
                      onChange={e => handlePasswordChange('current', e.target.value)}
                      className="form-input"
                      placeholder="Enter current password"
                      required
                    />
                  </div>
                  
                  <div className="form-field">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={passwords.new}
                      onChange={e => handlePasswordChange('new', e.target.value)}
                      className="form-input"
                      placeholder="Enter new password"
                      required
                    />
                  </div>
                  
                  <div className="form-field">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={e => handlePasswordChange('confirm', e.target.value)}
                      className="form-input"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                </div>

                {msg && <div className="success-message">{msg}</div>}
                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="primary-btn">
                  Change Password
                </button>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="notification-settings">
              <div className="section-header">
                <h2 className="section-title">Notification Preferences</h2>
                <p className="section-subtitle">Control what notifications you receive</p>
              </div>

              <form onSubmit={onUpdateNotifications} className="settings-form">
                <div className="form-section">
                  <h3>Email Notifications</h3>
                  <div className="notification-options">
                    <label className="notification-option">
                      <input
                        type="checkbox"
                        checked={notifications.emailMarketing}
                        onChange={e => handleNotificationChange('emailMarketing', e.target.checked)}
                      />
                      <div className="option-info">
                        <h4>Marketing Updates</h4>
                        <p>Receive emails about new features and promotions</p>
                      </div>
                    </label>
                    
                    <label className="notification-option">
                      <input
                        type="checkbox"
                        checked={notifications.emailPayments}
                        onChange={e => handleNotificationChange('emailPayments', e.target.checked)}
                      />
                      <div className="option-info">
                        <h4>Payment Notifications</h4>
                        <p>Get notified about payments and earnings</p>
                      </div>
                    </label>
                    
                    <label className="notification-option">
                      <input
                        type="checkbox"
                        checked={notifications.emailAnalytics}
                        onChange={e => handleNotificationChange('emailAnalytics', e.target.checked)}
                      />
                      <div className="option-info">
                        <h4>Analytics Reports</h4>
                        <p>Weekly performance summaries</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Push Notifications</h3>
                  <div className="notification-options">
                    <label className="notification-option">
                      <input
                        type="checkbox"
                        checked={notifications.pushMarketing}
                        onChange={e => handleNotificationChange('pushMarketing', e.target.checked)}
                      />
                      <div className="option-info">
                        <h4>Marketing Updates</h4>
                        <p>Push notifications for new features</p>
                      </div>
                    </label>
                    
                    <label className="notification-option">
                      <input
                        type="checkbox"
                        checked={notifications.pushPayments}
                        onChange={e => handleNotificationChange('pushPayments', e.target.checked)}
                      />
                      <div className="option-info">
                        <h4>Payment Alerts</h4>
                        <p>Instant notifications for payments</p>
                      </div>
                    </label>
                  </div>
                </div>

                {msg && <div className="success-message">{msg}</div>}
                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="primary-btn">
                  Save Notification Settings
                </button>
      </form>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="account-settings">
              <div className="section-header">
                <h2 className="section-title">Account Management</h2>
                <p className="section-subtitle">Manage your account settings</p>
              </div>

              <div className="account-info">
                <div className="info-card">
                  <h3>Account Status</h3>
                  <div className="status-info">
                    <span className="status-badge active">Active</span>
                    <p>Your account is in good standing</p>
                  </div>
                </div>
                
                <div className="info-card">
                  <h3>Member Since</h3>
                  <div className="status-info">
                    <span className="date-badge">December 2024</span>
                    <p>Thank you for being a valued creator</p>
                  </div>
                </div>
              </div>

              <div className="danger-zone">
                <h3>Danger Zone</h3>
                <div className="danger-actions">
                  <div className="danger-item">
                    <div className="danger-info">
                      <h4>Delete Account</h4>
                      <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
                    </div>
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="danger-btn"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>

              {showDeleteConfirm && (
                <div className="modal-overlay">
                  <div className="confirmation-modal">
                    <h3>Confirm Account Deletion</h3>
                    <p>Are you sure you want to delete your account? This will:</p>
                    <ul>
                      <li>Permanently delete all your data</li>
                      <li>Remove all your affiliate links</li>
                      <li>Cancel any pending payments</li>
                      <li>Remove you from the platform permanently</li>
                    </ul>
                    <p><strong>This action cannot be undone.</strong></p>
                    
                    <div className="modal-actions">
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="secondary-btn"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={onDeleteAccount}
                        className="danger-btn"
                      >
                        Yes, Delete My Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {error && <div className="error-message">{error}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}




