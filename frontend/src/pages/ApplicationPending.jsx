import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ApplicationPending() {
  const location = useLocation()
  const { user } = useAuth()
  const email = location.state?.email
  const navigationSubmitted = location.state?.submitted
  
  // Check if application was actually submitted by looking at the data
  // Just having PENDING status doesn't mean they filled the form
  const hasApplicationData = user?.bio && user?.socialMediaLinks && 
    (user.bio.trim() !== '' || Object.values(user.socialMediaLinks || {}).some(link => link && link.trim() !== ''))
  
  // Only consider submitted if they have actual application data OR explicitly came from form submission
  const submitted = navigationSubmitted || hasApplicationData

  return (
    <div className="application-status-container">
      <div className="status-card">
        <div className="status-icon">
          <div className="pending-animation">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" stroke="#fbbf24" strokeWidth="4" strokeDasharray="60 40" strokeLinecap="round">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="0 32 32;360 32 32"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="32" cy="32" r="20" fill="#fbbf24" opacity="0.2"/>
              <path d="M24 32l6 6 10-10" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className="status-content">
          <h1 className="status-title">
            {submitted ? 'Application Submitted!' : 'Account Created Successfully!'}
          </h1>
          <p className="status-message">
            {submitted 
              ? 'Your creator application has been submitted for review. Our team will evaluate your application within 24-48 hours.'
              : `Welcome to Zylink! Your account has been created${email ? ` for ${email}` : ''}.`
            }
          </p>
          
          <div className="next-steps">
            <h2>Next Steps:</h2>
            <div className="steps-list">
              <div className="step-item completed">
                <div className="step-icon">✅</div>
                <div className="step-content">
                  <h3>Account Created</h3>
                  <p>Your basic account has been set up</p>
                </div>
              </div>
              
              <div className={`step-item ${submitted ? 'completed' : 'current'}`}>
                <div className="step-icon">{submitted ? '✅' : '📝'}</div>
                <div className="step-content">
                  <h3>Complete Application</h3>
                  <p>{submitted ? 'Application form completed successfully' : 'Fill out your creator application with traffic links'}</p>
                </div>
              </div>
              
              <div className={`step-item ${submitted ? 'current' : ''}`}>
                <div className="step-icon">{submitted ? '⏳' : '🔒'}</div>
                <div className="step-content">
                  <h3>Admin Review</h3>
                  <p>{submitted ? 'Our team will review your application' : 'Application must be completed first'}</p>
                </div>
              </div>
              
              <div className="step-item">
                <div className="step-icon">🎉</div>
                <div className="step-content">
                  <h3>Account Activation</h3>
                  <p>Start creating affiliate links and earning!</p>
                </div>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            {!submitted ? (
              <>
                <Link to="/creator-application" className="primary-btn large">
                  Complete Application
                </Link>
                <Link to="/login" className="secondary-btn">
                  Sign In Later
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="primary-btn large">
                  Sign In to Check Status
                </Link>
              </>
            )}
          </div>

          <div className="info-box">
            <h4>📋 Application Requirements</h4>
            <ul>
              <li><strong>Social Media:</strong> Active Instagram, TikTok, YouTube, or Facebook account</li>
              <li><strong>Bio:</strong> Tell us about your audience and content niche</li>
              <li><strong>Group Links:</strong> Community groups like Discord, Telegram, WhatsApp, or Facebook (optional)</li>
              <li><strong>Easy Fill:</strong> Just usernames or page names - no need for full URLs!</li>
            </ul>
          </div>

          <div className="timeline-info">
            <p className="timeline-text">
              ⏱️ <strong>Review Timeline:</strong> Applications are typically reviewed within 24-48 hours.
              You'll receive an email notification once your application status changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
