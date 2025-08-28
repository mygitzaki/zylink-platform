import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: { email }
      })
      setMessage(res.message)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="split-screen">
      {/* Left Side - Marketing */}
      <div className="split-left">
        <div className="marketing-content">
          <h1 className="marketing-title">
            Forgot Your<br/>
            <span style={{color: '#8B5CF6'}}>Password?</span>
          </h1>
          <p className="marketing-subtitle">
            No worries! We'll send you a secure link to reset your password and get you back into your account.
          </p>
          
          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-dot"></div>
              <span>Secure Reset Process</span>
            </div>
            <div className="feature-item">
              <div className="feature-dot"></div>
              <span>Quick & Easy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="split-right">
        <div className="form-container">
          <div className="form-header">
            <h2 className="form-title">Reset Password</h2>
            <p className="form-subtitle">
              {submitted 
                ? "Check your email for reset instructions"
                : "Enter your email address and we'll send you a reset link"
              }
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={onSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <input 
                  id="email"
                  type="email"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="form-input" 
                  placeholder="Enter your email address"
                  required
                />
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {message && (
                <div className="success-message">
                  {message}
                </div>
              )}

              <button 
                type="submit"
                className="form-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Sending Reset Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          ) : (
            <div className="success-state">
              <div className="success-icon">📧</div>
              <h3>Check Your Email</h3>
              <p>
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
              <p>
                If you don't see the email in a few minutes, check your spam folder.
              </p>
            </div>
          )}

          <div className="form-footer">
            Remember your password?{' '}
            <Link to="/login" className="form-link">Back to Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
