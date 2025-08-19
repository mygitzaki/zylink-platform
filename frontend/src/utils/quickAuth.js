import { apiFetch } from '../lib/api'

/**
 * Quick authentication helper that handles expired tokens gracefully
 * Since we can't store passwords securely, we redirect to login when tokens expire
 */
export async function quickReLogin() {
  try {
    console.log('🔄 Token expired - redirecting to login for fresh authentication...')
    
    // Clear expired token
    localStorage.removeItem('token')
    
    // Redirect to login page for fresh authentication
    window.location.href = '/login'
    
    // This function won't return a token since we're redirecting
    throw new Error('Redirecting to login for fresh authentication')
  } catch (error) {
    console.error('❌ Auth refresh failed:', error)
    throw new Error(`Authentication expired - please login again`)
  }
}

/**
 * Enhanced API fetch with automatic token refresh
 */
export async function apiFetchWithAuth(path, options = {}) {
  try {
    return await apiFetch(path, options)
  } catch (error) {
    if (error.status === 401) {
      // Token expired, try to refresh
      try {
        const newToken = await quickReLogin()
        
        // Update token in localStorage
        localStorage.setItem('token', newToken)
        
        // Retry the original request with new token
        return await apiFetch(path, {
          ...options,
          token: newToken
        })
      } catch (refreshError) {
        // If refresh fails, redirect to login
        window.location.href = '/login'
        throw refreshError
      }
    }
    throw error
  }
}
