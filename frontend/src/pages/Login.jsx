import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const { setToken } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('realadmin@test.com')
  const [password, setPassword] = useState('adminpass123')
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
            <span style={{color: '#fbbf24'}}>Zylike</span>
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
            <p className="form-subtitle">Sign in to your Zylink account</p>
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
              <label className="form-label" htmlFor="password">Password</label>
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

          {/* Demo Credentials */}
          <div style={{
            background: '#eff6ff',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginTop: '1.5rem',
            border: '1px solid #bfdbfe'
          }}>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#1e40af',
              marginBottom: '0.5rem'
            }}>
              Demo Credentials:
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#3730a3',
              lineHeight: '1.5'
            }}>
              <strong>Admin:</strong> admin@zylink.app / Pass1234!<br/>
              <strong>Creator:</strong> Create new account via signup
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}