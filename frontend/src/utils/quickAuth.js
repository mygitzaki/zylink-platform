import { apiFetch } from '../lib/api'

/**
 * Quick authentication helper using saved admin credentials
 * This provides a seamless re-login experience when tokens expire
 */
export async function quickReLogin() {
  try {
    console.log('🔄 Attempting quick re-login...')
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'realadmin@test.com',
        password: 'adminpass123'
      }
    })
    
    if (!response.token) {
      throw new Error('No token received from login')
    }
    
    console.log('✅ Quick re-login successful')
    return response.token
  } catch (error) {
    console.error('❌ Quick re-login failed:', error)
    throw new Error(`Failed to refresh authentication: ${error.message}`)
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
