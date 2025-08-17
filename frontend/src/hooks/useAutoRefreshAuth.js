import { useCallback } from 'react'
import { useAuth } from './useAuth'
import { quickReLogin } from '../utils/quickAuth'

/**
 * Hook that provides automatic authentication refresh
 * when 401 errors occur
 */
export function useAutoRefreshAuth() {
  const { token, setToken } = useAuth()
  
  const refreshAuth = useCallback(async () => {
    try {
      console.log('🔄 Auto-refreshing authentication...')
      const newToken = await quickReLogin()
      setToken(newToken)
      console.log('✅ Authentication refreshed successfully')
      return newToken
    } catch (error) {
      console.error('❌ Failed to refresh authentication:', error)
      // Clear invalid token
      setToken('')
      throw error
    }
  }, [setToken])
  
  const makeAuthenticatedRequest = useCallback(async (apiCall) => {
    try {
      // Try the original request
      return await apiCall()
    } catch (error) {
      // If 401, try to refresh and retry
      if (error.status === 401 || error.message?.includes('Missing token')) {
        console.log('🔄 401 detected, attempting auth refresh...')
        try {
          await refreshAuth()
          // Retry the original request with new token
          return await apiCall()
        } catch (refreshError) {
          console.error('❌ Auth refresh failed:', refreshError)
          throw refreshError
        }
      }
      throw error
    }
  }, [refreshAuth])
  
  return {
    token,
    refreshAuth,
    makeAuthenticatedRequest
  }
}
