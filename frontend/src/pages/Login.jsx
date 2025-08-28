import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const { setToken } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e){
    e.preventDefault()
    setError('')
    setLoading(true)
    try{
      const res = await apiFetch('/api/auth/login',{method:'POST', body:{email, password}})
      setToken(res.token)
      nav('/link-generator')
    }catch(err){ setError(err.message) }
    finally{ setLoading(false) }
  }

  return (
    <div className="split-screen">
      {/* Left Side - Marketing */}
      <div className="split-left">
        <div className="marketing-content">
          <h1 className="marketing-title">
            Welcome to<br/>
            <span style={{color: '#8B5CF6'}}>Zylike</span>
          </h1>
          <p className="marketing-subtitle">
            The ultimate creator platform. Track performance, manage links, and maximize your earnings.
          </p>
          
          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-dot"></div>
              <span>Real-time Analytics</span>
            </div>
            <div className="feature-item">
              <div className="feature-dot"></div>
              <span>Instant Payments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="split-right">
        <div className="form-container">
          <div className="form-header">
            <h2 className="form-title">Welcome Back</h2>
            <p className="form-subtitle">Sign in to your Zylike account</p>
          </div>

          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input 
                id="email"
                type="email"
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                className="form-input" 
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" htmlFor="password">Password</label>
                <Link to="/forgot-password" className="forgot-password-link">
                  Forgot password?
                </Link>
              </div>
              <input 
                id="password"
                type="password" 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
                className="form-input" 
                placeholder="Enter your password"
                required
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
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="form-footer">
            Don't have an account?{' '}
            <Link to="/signup" className="form-link">Sign up here</Link>
          </div>
        </div>
      </div>
    </div>
  )
}