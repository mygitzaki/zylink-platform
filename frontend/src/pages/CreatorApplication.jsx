import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

export default function CreatorApplication() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [formData, setFormData] = useState({
    bio: '',
    socialMediaLinks: {
      instagram: '',
      youtube: '',
      tiktok: '',
      facebook: '',
      website: ''
    },
    groupLinks: {
      telegram: '',
      discord: '',
      whatsapp: '',
      facebookGroup: ''
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSocialChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      socialMediaLinks: {
        ...prev.socialMediaLinks,
        [platform]: value
      }
    }))
  }

  const handleGroupChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      groupLinks: {
        ...prev.groupLinks,
        [platform]: value
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Simple validation - just check if bio and at least one social link is provided
    if (!formData.bio.trim()) {
      setError('Please provide a bio describing your audience')
      return
    }

    const hasSocialLink = Object.values(formData.socialMediaLinks).some(link => link.trim())
    if (!hasSocialLink) {
      setError('Please provide at least one social media account')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      await apiFetch('/api/creator/profile', {
        method: 'PUT',
        token,
        body: {
          bio: formData.bio,
          socialMediaLinks: formData.socialMediaLinks,
          groupLinks: formData.groupLinks
        }
      })
      
      // Redirect to application submitted page
      navigate('/application-pending', { state: { submitted: true } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="application-form-container">
      <div className="application-form-card">
        <div className="form-header">
          <h1 className="form-title">Complete Your Creator Application</h1>
          <p className="form-subtitle">
            Tell us about yourself and your audience to get approved for the Zylike creator program.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="application-form">
          {/* Bio Section */}
          <div className="form-section">
            <h3>About You & Your Audience</h3>
            <div className="form-field">
              <label>Bio & Audience Description *</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself, your content niche, and your audience. What type of products do you promote? Who follows you?"
                className="form-textarea"
                rows="5"
                required
              />
              <small>Describe your content style, audience demographics, and promotion strategy</small>
            </div>
          </div>

          {/* Social Media Links */}
          <div className="form-section">
            <h3>Social Media Accounts *</h3>
            <p className="section-description">Provide your social media usernames or links (at least one required - full URLs not required)</p>
            
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label-mobile">📷 Instagram</label>
                <input
                  type="text"
                  value={formData.socialMediaLinks.instagram}
                  onChange={(e) => handleSocialChange('instagram', e.target.value)}
                  placeholder="@yourusername or instagram.com/yourusername"
                  className="form-input form-input-mobile"
                />
              </div>
              
              <div className="form-field">
                <label className="form-label-mobile">▶️ YouTube</label>
                <input
                  type="text"
                  value={formData.socialMediaLinks.youtube}
                  onChange={(e) => handleSocialChange('youtube', e.target.value)}
                  placeholder="@yourusername or your channel name"
                  className="form-input form-input-mobile"
                />
              </div>
              
              <div className="form-field">
                <label className="form-label-mobile">🎵 TikTok</label>
                <input
                  type="text"
                  value={formData.socialMediaLinks.tiktok}
                  onChange={(e) => handleSocialChange('tiktok', e.target.value)}
                  placeholder="@yourusername or tiktok.com/@yourusername"
                  className="form-input form-input-mobile"
                />
              </div>
              
              <div className="form-field">
                <label className="form-label-mobile">📘 Facebook Page</label>
                <input
                  type="text"
                  value={formData.socialMediaLinks.facebook}
                  onChange={(e) => handleSocialChange('facebook', e.target.value)}
                  placeholder="Your page name or facebook.com/yourpage"
                  className="form-input form-input-mobile"
                />
              </div>
              
              <div className="form-field">
                <label className="form-label-mobile">🌐 Website/Blog</label>
                <input
                  type="text"
                  value={formData.socialMediaLinks.website}
                  onChange={(e) => handleSocialChange('website', e.target.value)}
                  placeholder="yourwebsite.com or blog name"
                  className="form-input form-input-mobile"
                />
              </div>
            </div>
          </div>

          {/* Group Links */}
          <div className="form-section">
            <h3>Community Groups (Optional)</h3>
            <p className="section-description">Your community groups where you engage with followers (group names or links)</p>
            
            <div className="form-grid">
              <div className="form-field">
                <label>💬 Telegram Group</label>
                <input
                  type="text"
                  value={formData.groupLinks.telegram}
                  onChange={(e) => handleGroupChange('telegram', e.target.value)}
                  placeholder="Group name or t.me/yourgroup"
                  className="form-input"
                />
              </div>
              
              <div className="form-field">
                <label>🎮 Discord Server</label>
                <input
                  type="text"
                  value={formData.groupLinks.discord}
                  onChange={(e) => handleGroupChange('discord', e.target.value)}
                  placeholder="Server name or discord.gg/yourinvite"
                  className="form-input"
                />
              </div>
              
              <div className="form-field">
                <label>📱 WhatsApp Group</label>
                <input
                  type="text"
                  value={formData.groupLinks.whatsapp}
                  onChange={(e) => handleGroupChange('whatsapp', e.target.value)}
                  placeholder="Group name or chat.whatsapp.com/invite"
                  className="form-input"
                />
              </div>
              
              <div className="form-field">
                <label>👥 Facebook Group</label>
                <input
                  type="text"
                  value={formData.groupLinks.facebookGroup}
                  onChange={(e) => handleGroupChange('facebookGroup', e.target.value)}
                  placeholder="Group name or facebook.com/groups/yourgroup"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button 
              type="submit" 
              disabled={loading}
              className="primary-btn large"
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Submitting Application...
                </>
              ) : (
                'Submit Application for Review'
              )}
            </button>
          </div>

          <div className="application-info">
            <h4>📋 What Happens Next?</h4>
            <ul>
              <li>Our team will review your application within 24-48 hours</li>
              <li>We'll check your social media presence and audience engagement</li>
              <li>You'll receive an email notification once approved</li>
              <li>After approval, you can start creating affiliate links and earning commissions</li>
            </ul>
            
            <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--neutral-50)', borderRadius: 'var(--radius-lg)' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
                💡 <strong>Tip:</strong> You can use usernames, page names, or full links - whatever is easier for you!
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
