import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'
import { quickReLogin } from '../utils/quickAuth'
// Import new Zylike-inspired UI components
import { Button, Card, Container, Skeleton, RevenueTrendChart, ClicksConversionsChart, ChartSkeleton } from '../components/ui'

export default function CreatorAnalytics() {
  const { user, token, setToken } = useAuth()
  const [analytics, setAnalytics] = useState({
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    recentActivity: [],
    monthlyTrends: [],
    earningsTrend: []
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Load cached data first to avoid showing zeros while API loads
    loadCachedDataFirst()
    
    // Always try to fetch fresh data for the current time range
    // The API function will handle cache vs fresh data logic
    console.log(`🔄 Attempting to load fresh analytics data for ${timeRange}`)
    loadAnalytics()
  }, [timeRange])

  const loadCachedDataFirst = () => {
    // Load cached data immediately to show something while API loads
    let cachedData = loadFromCache('data', timeRange, true) // silent = true
    
    // Smart fallback: use other timeRange data if current has no meaningful data
    if (!cachedData || (cachedData && cachedData.totalRevenue === 0)) {
      const otherRange = timeRange === '7d' ? '30d' : '7d';
      const fallbackData = loadFromCache('data', otherRange, true);
      if (fallbackData && fallbackData.totalRevenue > 0) {
        console.log(`📦 Using ${otherRange} analytics data as fallback for ${timeRange} (has real data vs zeros)`);
        cachedData = fallbackData;
      }
    }
    
    if (cachedData) {
      console.log('📦 Pre-loading cached analytics data')
      setAnalytics(cachedData)
      try {
        const timestamp = JSON.parse(localStorage.getItem(getCacheKey('data', timeRange)))?.timestamp
        if (timestamp) {
          setLastUpdated(new Date(timestamp))
          setIsOffline(true) // Will be set to false when fresh data loads
        }
      } catch (error) {
        console.warn('Failed to set cache timestamp:', error)
      }
      setLoading(false)
      return true // Cache was found and loaded
    }
    return false // No cache found
  }

  // Cache utilities for API fallback
  const getCacheKey = (type, range) => `analytics_${type}_${range}_${user?.id || 'anonymous'}`
  
  const hasValidCache = (type, range = timeRange) => {
    try {
      const cached = localStorage.getItem(getCacheKey(type, range))
      if (cached) {
        const cacheData = JSON.parse(cached)
        // Check if cache is still valid (less than 4 hours old)
        if (Date.now() - cacheData.timestamp < 240 * 60 * 1000) {
          return cacheData.data
        }
      }
    } catch (error) {
      console.warn('Failed to check cache validity:', error)
    }
    return null
  }
  
  const saveToCache = (type, data, range = timeRange) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        timeRange: range
      }
      localStorage.setItem(getCacheKey(type, range), JSON.stringify(cacheData))
      console.log(`💾 Cached ${type} data for ${range}`)
    } catch (error) {
      console.warn('Failed to cache data:', error)
    }
  }
  
  const loadFromCache = (type, range = timeRange, silent = false) => {
    try {
      const cached = localStorage.getItem(getCacheKey(type, range))
      if (cached) {
        const cacheData = JSON.parse(cached)
        // Use cache if less than 4 hours old (240 minutes)
        if (Date.now() - cacheData.timestamp < 240 * 60 * 1000) {
          console.log(`📦 Using cached ${type} data for ${range}${silent ? ' (silent)' : ''}`)
          if (!silent) {
            setLastUpdated(new Date(cacheData.timestamp))
            setIsOffline(true)
          }
          return cacheData.data
        }
      }
    } catch (error) {
      console.warn('Failed to load cached data:', error)
    }
    return null
  }

  const loadAnalytics = async () => {
    try {
      // Check if we have valid cached data for this specific time range
      const validCache = hasValidCache('data', timeRange)
      console.log(`🔍 [ANALYTICS] Cache check for ${timeRange}:`, {
        cacheExists: !!validCache,
        totalRevenue: validCache?.totalRevenue,
        totalClicks: validCache?.totalClicks,
        earningsTrend: validCache?.earningsTrend?.length
      })
      
      if (validCache && (validCache.totalRevenue > 0 || validCache.totalClicks > 0)) {
        console.log(`📦 [FRONTEND] Valid analytics cache exists for ${timeRange} (${Math.round((240 * 60 * 1000 - (Date.now() - JSON.parse(localStorage.getItem(getCacheKey('data', timeRange)))?.timestamp)) / (60 * 1000))} min remaining) - skipping API call`)
        return
      }
      
      setLoading(true)
      
      // If no token, skip loading
      if (!token) {
        console.log('No token available, skipping analytics load')
        setLoading(false)
        return
      }
      
      console.log('🔄 Loading analytics data...')
      
      // Convert timeRange to days format for API
      const daysMap = { '7d': 7, '30d': 30 }
      const days = daysMap[timeRange] || 30
      
      console.log(`📊 Loading data for ${days} days (${timeRange})`)
      
      const [analyticsRes, earningsRes] = await Promise.all([
        apiFetch(`/api/creator/analytics-enhanced?days=${days}`, { token }),
        apiFetch(`/api/creator/earnings-summary?days=${days}`, { token })
      ])
      
      console.log('📊 Analytics response:', analyticsRes)
      console.log('💰 Earnings response:', earningsRes)
      
      // DEBUG: Check if we're getting empty data
      if (!analyticsRes || !analyticsRes.performanceMetrics) {
        console.error('❌ Analytics response is empty or missing performanceMetrics:', analyticsRes)
        throw new Error('Invalid analytics response')
      }
      if (!earningsRes || earningsRes.commissionEarned === undefined) {
        console.error('❌ Earnings response is empty or missing commissionEarned:', earningsRes)
        throw new Error('Invalid earnings response')
      }
      
      // Prioritize Impact.com data from analytics API, fallback to earnings API
      const totalRevenue = analyticsRes.performanceMetrics?.revenue || earningsRes.commissionEarned || 0
      const totalClicks = analyticsRes.performanceMetrics?.clicks || 0
      const totalConversions = analyticsRes.performanceMetrics?.conversions || 0
      const conversionRate = analyticsRes.performanceMetrics?.conversionRate || (totalClicks > 0 ? ((totalConversions / totalClicks) * 100) : 0)
      const averageOrderValue = analyticsRes.performanceMetrics?.averageOrderValue || (totalConversions > 0 ? (totalRevenue / totalConversions) : 0)
      
      console.log('📊 Using Impact.com data source:', {
        revenue: totalRevenue,
        clicks: totalClicks,
        conversions: totalConversions,
        conversionRate: conversionRate.toFixed(2) + '%',
        dataSource: analyticsRes.dataSource || 'unknown'
      })
      
      const analyticsData = {
        totalClicks,
        totalConversions,
        totalRevenue,
        conversionRate,
        averageOrderValue,
        recentActivity: analyticsRes.recentActivity || [],
        monthlyTrends: analyticsRes.monthlyTrends || [],
        earningsTrend: analyticsRes.earningsTrend || []
      }
      
      // Success: Save to cache and update state
      saveToCache('data', analyticsData)
      setAnalytics(analyticsData)
      setLastUpdated(new Date())
      setIsOffline(false)
      console.log(`✅ [FRONTEND] FRESH ANALYTICS DATA - Loaded from API and cached for 4 hours`)
      
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
      
      // Try to load from cache first
      const cachedData = loadFromCache('data')
      if (cachedData) {
        console.log('📦 [FRONTEND] CACHED ANALYTICS DATA - Using cached data due to API failure')
        setAnalytics(cachedData)
      } else {
        console.log('⚠️ No cached analytics data available, using safe defaults')
        // Only use defaults if no cache available
        setAnalytics({
          totalClicks: 0,
          totalConversions: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          recentActivity: [],
          monthlyTrends: [],
          earningsTrend: []
        })
        setIsOffline(true)
      }
      
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
            
            {/* Time Range Selector */}
            <div className="flex items-center gap-4">
              <Card variant="glass" className="w-full sm:w-auto">
                <div className="flex space-x-2">
                  <Button
                    variant={timeRange === '7d' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setTimeRange('7d')}
                  >
                    7 Days
                  </Button>
                  <Button
                    variant={timeRange === '30d' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setTimeRange('30d')}
                  >
                    30 Days
                  </Button>
                </div>
              </Card>
              
              {/* Clean status indicator for analytics */}
              {lastUpdated && (
                <span className="text-xs text-gray-400">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              
              {/* Only show refresh button to admins or in development */}
              {(process.env.NODE_ENV === 'development' || user?.role === 'ADMIN') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    console.log('🔄 Manual analytics refresh - bypassing cache')
                    localStorage.removeItem(getCacheKey('data', timeRange))
                    loadAnalytics()
                  }}
                  className="text-xs"
                >
                  Refresh
                </Button>
              )}
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

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend Chart */}
          <Card variant="glass">
            <div className="p-6">
              {loading ? (
                <ChartSkeleton />
              ) : analytics.earningsTrend && analytics.earningsTrend.length > 0 ? (
                <RevenueTrendChart 
                  data={analytics.earningsTrend.map(trend => ({
                    date: trend.date,
                    revenue: trend.total || 0
                  }))} 
                  timeRange={timeRange} 
                />
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-blue-300 text-2xl">📊</span>
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">Revenue Trend</h3>
                    <p className="text-gray-400 text-sm">No revenue data available yet</p>
                    <p className="text-blue-300 text-xs">Create your first link to see trends</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
          
          {/* Clicks vs Conversions Chart */}
          <Card variant="glass">
            <div className="p-6">
              {loading ? (
                <ChartSkeleton />
              ) : analytics.earningsTrend && analytics.earningsTrend.length > 0 ? (
                <ClicksConversionsChart 
                  data={analytics.earningsTrend.map((trend, index) => {
                    // Use real data when available, distribute across trend for visualization
                    const totalClicks = analytics.totalClicks || 0;
                    const totalConversions = analytics.totalConversions || 0;
                    const dayWeight = trend.total / (analytics.earningsTrend.reduce((sum, t) => sum + (t.total || 0), 0) || 1);
                    
                    return {
                      date: trend.date,
                      clicks: Math.floor(totalClicks * dayWeight),
                      conversions: Math.floor(totalConversions * dayWeight)
                    };
                  })} 
                  timeRange={timeRange} 
                />
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-purple-300 text-2xl">🎯</span>
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">Clicks vs Conversions</h3>
                    <p className="text-gray-400 text-sm">No click data available yet</p>
                    <p className="text-purple-300 text-xs">Activity will appear once you start sharing links</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>


        {/* Recent Activity */}
        <Card variant="glass">
          <div className="p-6">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center">
              <span className="text-emerald-300 text-2xl mr-3">⚡</span>
              Recent Activity
            </h3>
            {analytics.recentActivity && analytics.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <span className="text-emerald-300 text-sm">🔗</span>
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">Link Created</p>
                        <p className="text-gray-400 text-xs">{activity.shortCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-300 text-sm font-semibold">{activity.clicks} clicks</p>
                      <p className="text-gray-500 text-xs">{new Date(activity.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-emerald-300 text-2xl">⚡</span>
                </div>
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




