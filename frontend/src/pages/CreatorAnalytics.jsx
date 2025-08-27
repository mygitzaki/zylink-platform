import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'
import { quickReLogin } from '../utils/quickAuth'
// Import new Zylike-inspired UI components
import { Button, Card, Container, Skeleton } from '../components/ui'

export default function CreatorAnalytics() {
  const { user, token, setToken } = useAuth()
  const [analytics, setAnalytics] = useState({
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    conversionRate: 0,
    averageOrderValue: 0,
    topPerformingLinks: [],
    recentActivity: [],
    monthlyTrends: []
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      // If no token, skip loading
      if (!token) {
        console.log('No token available, skipping analytics load')
        setLoading(false)
        return
      }
      
      console.log('🔄 Loading analytics data...')
      
      // Convert timeRange to days format for API
      const daysMap = { '7d': 7, '30d': 30, '90d': 90 }
      const days = daysMap[timeRange] || 30
      
      console.log(`📊 Loading data for ${days} days (${timeRange})`)
      
      const [analyticsRes, earningsRes] = await Promise.all([
        apiFetch(`/api/creator/analytics-enhanced?days=${days}`, { token }),
        apiFetch(`/api/creator/earnings-summary?days=${days}`, { token })
      ])
      
      console.log('📊 Analytics response:', analyticsRes)
      console.log('💰 Earnings response:', earningsRes)
      
      // Extract data from the new API structure
      const totalRevenue = earningsRes.commissionEarned || 0
      const totalClicks = analyticsRes.clicks || 0
      const totalConversions = analyticsRes.conversions || 0
      const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100) : 0
      const averageOrderValue = totalConversions > 0 ? (totalRevenue / totalConversions) : 0
      
      setAnalytics({
        totalClicks,
        totalConversions,
        totalRevenue,
        conversionRate,
        averageOrderValue,
        topPerformingLinks: analyticsRes.topLinks || [],
        recentActivity: analyticsRes.recentActivity || [],
        monthlyTrends: analyticsRes.monthlyTrends || []
      })
      
      console.log('✅ Analytics data loaded successfully')
      console.log('📊 Final analytics state:', {
        totalRevenue,
        totalClicks,
        totalConversions,
        conversionRate: conversionRate.toFixed(2) + '%',
        averageOrderValue: averageOrderValue.toFixed(2),
        timeRange,
        days
      })
    } catch (err) {
      console.error('❌ Failed to load analytics:', err)
      if (err.status === 401 || err.message?.includes('Missing token')) {
        console.log('🔄 401 detected - token may be expired. Use the Refresh button.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <Container className="py-4 sm:py-6 lg:py-8">
          <Skeleton.Dashboard className="animate-fadeIn" />
        </Container>
      </div>
    )
  }

  // Debug information (remove in production)
  console.log('🎯 Analytics component render:', { 
    loading, 
    analytics, 
    user: user?.email,
    hasToken: !!token 
  })

  // Error boundary - if something goes wrong, show a fallback
  if (!analytics || typeof analytics !== 'object') {
    console.error('❌ Analytics data is invalid:', analytics)
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <Container className="py-4 sm:py-6 lg:py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-400 mb-6">Unable to load analytics data</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              Reload Page
            </button>
          </div>
        </Container>
      </div>
    )
  }

  // Fallback content if analytics data is empty
  const hasData = analytics.totalClicks > 0 || analytics.totalConversions > 0 || analytics.totalRevenue > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <Container className="py-4 sm:py-6 lg:py-8 animate-fadeIn">
        {/* Hero Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-2xl">📊</span>
                </div>
                <span>Analytics Dashboard</span>
              </h1>
              <p className="text-purple-200 text-sm sm:text-base lg:text-lg">
                Track your performance and optimize your affiliate strategy
              </p>
              
              {/* No Data Message */}
              {!hasData && (
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <span className="text-blue-300 text-lg">💡</span>
                    </div>
                    <div>
                      <p className="text-blue-200 font-medium">Getting Started</p>
                      <p className="text-blue-300 text-sm">Create your first affiliate link to start tracking analytics and earnings!</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Controls */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              {/* Refresh Button */}
              <Button
                onClick={async () => {
                  try {
                    console.log('🔄 Refreshing authentication and data...')
                    const newToken = await quickReLogin()
                    setToken(newToken)
                    setTimeout(() => loadAnalytics(), 100) // Small delay to ensure token is set
                  } catch (error) {
                    console.error('❌ Refresh failed:', error)
                    alert('Refresh failed. Please try logging in manually.')
                  }
                }}
                variant="secondary"
                size="sm"
                className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
              >
                🔄 Refresh
              </Button>
              
              {/* Force Fresh Data Button */}
              <Button
                onClick={() => {
                  console.log('🔄 Force refreshing analytics data...')
                  loadAnalytics()
                }}
                variant="secondary"
                size="sm"
                className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
              >
                📊 Fresh Data
              </Button>
              
              {/* Time Range Selector */}
              <Card variant="glass" className="w-full sm:w-auto">
                <div className="flex space-x-2">
                <Button
                  variant={timeRange === '7d' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setTimeRange('7d')
                    // Force reload to clear cache
                    setTimeout(() => loadAnalytics(), 100)
                  }}
                >
                  7 Days
                </Button>
                <Button
                  variant={timeRange === '30d' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setTimeRange('30d')
                    // Force reload to clear cache
                    setTimeout(() => loadAnalytics(), 100)
                  }}
                >
                  30 Days
                </Button>
                <Button
                  variant={timeRange === '90d' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setTimeRange('90d')
                    // Force reload to clear cache
                    setTimeout(() => loadAnalytics(), 100)
                  }}
                >
                  90 Days
                </Button>
              </div>
            </Card>
            </div>
          </div>
        </div>

        {/* Key Metrics - Zylike Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
          
          {/* Total Revenue */}
          <Card variant="glass" hover className="group">
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300">
                    +12.5%
                  </div>
                </div>
                <h3 className="text-sm font-medium text-white/60 mb-1 uppercase tracking-wide">Total Revenue</h3>
                <p className="text-2xl font-bold text-white">${analytics.totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-green-300 mt-1">💎 Commission earnings</p>
              </div>
            </div>
          </Card>

          {/* Total Clicks */}
          <Card variant="glass" hover className="group">
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122" />
                    </svg>
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300">
                    +8.2%
                  </div>
                </div>
                <h3 className="text-sm font-medium text-white/60 mb-1 uppercase tracking-wide">Total Clicks</h3>
                <p className="text-2xl font-bold text-white">{analytics.totalClicks.toLocaleString()}</p>
                <p className="text-xs text-blue-300 mt-1">👆 Link interactions</p>
              </div>
            </div>
          </Card>

          {/* Conversions */}
          <Card variant="glass" hover className="group">
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300">
                    +15.3%
                  </div>
                </div>
                <h3 className="text-sm font-medium text-white/60 mb-1 uppercase tracking-wide">Conversions</h3>
                <p className="text-2xl font-bold text-white">{analytics.totalConversions.toLocaleString()}</p>
                <p className="text-xs text-purple-300 mt-1">🎯 Successful sales</p>
              </div>
            </div>
          </Card>

          {/* Conversion Rate */}
          <Card variant="glass" hover className="group">
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300">
                    +2.1%
                  </div>
                </div>
                <h3 className="text-sm font-medium text-white/60 mb-1 uppercase tracking-wide">Conversion Rate</h3>
                <p className="text-2xl font-bold text-white">{analytics.conversionRate.toFixed(2)}%</p>
                <p className="text-xs text-orange-300 mt-1">📈 Click-to-sale ratio</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Data Status Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card variant="glass">
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-300 text-2xl">📊</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Performance Charts</h3>
              {analytics.totalClicks > 0 ? (
                <p className="text-gray-400 text-sm">Interactive analytics coming soon</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">No data available yet</p>
                  <p className="text-blue-300 text-xs">Create your first link to see analytics</p>
                </div>
              )}
            </div>
          </Card>
          
          <Card variant="glass">
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-300 text-2xl">🏆</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Top Links</h3>
              {analytics.topPerformingLinks.length > 0 ? (
                <p className="text-gray-400 text-sm">Performance tracking coming soon</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">No links created yet</p>
                  <p className="text-purple-300 text-xs">Start by creating your first affiliate link</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card variant="glass">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-emerald-300 text-2xl">⚡</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Recent Activity</h3>
            {analytics.recentActivity.length > 0 ? (
              <p className="text-gray-400 text-sm">Activity timeline coming soon</p>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">No activity yet</p>
                <p className="text-emerald-300 text-xs">Your activity will appear here once you start using links</p>
              </div>
            )}
          </div>
        </Card>
      </Container>
    </div>
  )
}




