import { createContext, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
  }, [token])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    apiFetch('/api/auth/profile', { 
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(setUser)
      .catch((error) => {
        console.error('Auth profile error:', error)
        // If token is invalid, clear it
        if (error.status === 401) {
          setToken('')
          setUser(null)
        }
      })
      .finally(() => setLoading(false))
  }, [token])

  const value = useMemo(() => ({ token, setToken, user, setUser, loading }), [token, user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Export the context for internal use
export { AuthContext }




