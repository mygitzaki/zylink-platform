import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'

export default function Signup(){
  const { setToken } = useAuth()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const [name,setName] = useState('')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [referralCode,setReferralCode] = useState('')
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(false)

  useEffect(()=>{ const r = sp.get('ref'); if(r) setReferralCode(r) },[sp])

  async function onSubmit(e){
    e.preventDefault()
    setError(''); setLoading(true)
    try{
      const res = await apiFetch('/api/creator/signup',{ method:'POST', body:{ name,email,password, referralCode: referralCode || undefined } })
      
      // Store the token for authentication
      if (res.token) {
        setToken(res.token)
        // Navigate to application pending with token stored
        nav('/application-pending', { state: { email } })
      } else {
        setError('Signup successful but no token received')
      }
    }catch(err){ setError(err.message) } finally { setLoading(false) }
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
            <h2 className="form-title">Join Zylike</h2>
            <p className="form-subtitle">Create your account and complete our creator application</p>
          </div>

          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Name</label>
              <input 
                id="name"
                type="text"
                value={name} 
                onChange={e=>setName(e.target.value)} 
                className="form-input" 
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
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
                placeholder="Create a password"
                required
              />
            </div>

            {referralCode && (
              <div className="form-group">
                <label className="form-label" htmlFor="referralCode">Referral Code</label>
                <input 
                  id="referralCode"
                  type="text"
                  value={referralCode} 
                  onChange={e=>setReferralCode(e.target.value)} 
                  className="form-input" 
                  placeholder="Referral code"
                />
              </div>
            )}

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
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="form-footer">
            Already have an account?{' '}
            <Link to="/login" className="form-link">Sign in here</Link>
          </div>

          {/* Next Steps Box */}
          <div style={{
            background: '#f1f5f9',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginTop: '1.5rem',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#334155'
            }}>
              📋 Next Steps After Account Creation
            </div>
            <ul style={{
              fontSize: '0.75rem',
              color: '#64748b',
              margin: 0,
              paddingLeft: '1rem'
            }}>
              <li>Complete your creator profile</li>
              <li>Connect your social media accounts</li>
              <li>Submit application for review</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}