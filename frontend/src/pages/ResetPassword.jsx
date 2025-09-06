import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token')
    }
  }, [token])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: { token, newPassword: password }
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="split-screen">
        <div className="split-left">
          <div className="marketing-content">
            <h1 className="marketing-title">
              Invalid<br/>
              <span style={{color: '#8B5CF6'}}>Reset Link</span>
            </h1>
          </div>
        </div>
        <div className="split-right">
          <div className="form-container">
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Invalid Reset Link</h3>
              <p>This password reset link is invalid or has expired.</p>
              <Link to="/forgot-password" className="form-button">
                Request New Reset Link
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="split-screen">
      {/* Left Side - Marketing */}
      <div className="split-left">
        <div className="marketing-content">
          <h1 className="marketing-title">
            Create New<br/>
            <span style={{color: '#8B5CF6'}}>Password</span>
          </h1>
          <p className="marketing-subtitle">
            Choose a strong password to secure your Zylike account.
          </p>
          
          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-dot"></div>
              <span>Secure & Encrypted</span>
            </div>
            <div className="feature-item">
              <div className="feature-dot"></div>
              <span>At least 6 characters</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="split-right">
        <div className="form-container">
          <div className="form-header">
            <h2 className="form-title">Reset Your Password</h2>
            <p className="form-subtitle">Enter your new password below</p>
          </div>

          {!success ? (
            <form onSubmit={onSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="password">New Password</label>
                <input 
                  id="password"
                  type="password"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="form-input" 
                  placeholder="Enter your new password"
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                <input 
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  className="form-input" 
                  placeholder="Confirm your new password"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="error-message">
                  {error}
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
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          ) : (
            <div className="success-state">
              <div className="success-icon">✅</div>
              <h3>Password Reset Successful!</h3>
              <p>
                Your password has been reset successfully. You will be redirected to the login page shortly.
              </p>
              <Link to="/login" className="form-button">
                Continue to Login
              </Link>
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


