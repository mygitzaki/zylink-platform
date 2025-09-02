import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'

export default function Earnings() {
  const { user, token } = useAuth()
  const [earningsSummary, setEarningsSummary] = useState({
    commissionEarned: 0,
    availableForWithdraw: 0,
    pendingApproval: 0,
    totalEarnings: 0,
    payoutsRequested: 0,
    analytics: {
      conversionRate: 0,
      averageOrderValue: 0,
      totalActions: 0
    }
  })
  const [analytics, setAnalytics] = useState({
    earningsTrend: [],
    performanceMetrics: { clicks: 0, conversions: 0, revenue: 0, conversionRate: 0 },
    topLinks: [],
    recentActivity: []
  })
  const [salesData, setSalesData] = useState({
    totalSales: 0,
    salesCount: 0,
    recentSales: []
  })
  const [salesLimit, setSalesLimit] = useState(10) // Track how many sales to show
  const [selectedSale, setSelectedSale] = useState(null)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    loadEarningsSummary()
    loadAnalytics()
    loadSalesData()
  }, [timeRange])

  const loadEarningsSummary = async () => {
    try {
      setLoading(true)
      let path = '/api/creator/earnings-summary'
      if (timeRange === 'custom' && customStart && customEnd) {
        path += `?startDate=${customStart}&endDate=${customEnd}`
      } else {
        const days = timeRange === '7d' ? 7 : (timeRange === '90d' ? 90 : 30)
        path += `?days=${days}`
      }
      
      const summaryRes = await apiFetch(path, { token })
      setEarningsSummary(summaryRes)
      
    } catch (err) {
      console.error('Failed to load earnings summary:', err)
      // Set safe defaults
      setEarningsSummary({
        commissionEarned: 0,
        availableForWithdraw: 0,
        pendingApproval: 0,
        totalEarnings: 0,
        payoutsRequested: 0,
        analytics: { conversionRate: 0, averageOrderValue: 0, totalActions: 0 }
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      let path = '/api/creator/analytics-enhanced'
      if (timeRange === 'custom' && customStart && customEnd) {
        path += `?startDate=${customStart}&endDate=${customEnd}`
      } else {
        const days = timeRange === '7d' ? 7 : (timeRange === '90d' ? 90 : 30)
        path += `?days=${days}`
      }
      
      const analyticsRes = await apiFetch(path, { token })
      setAnalytics(analyticsRes)
      
    } catch (err) {
      console.error('Failed to load analytics:', err)
      // Set safe defaults
      setAnalytics({
        earningsTrend: [],
        performanceMetrics: { clicks: 0, conversions: 0, revenue: 0, conversionRate: 0 },
        topLinks: [],
        recentActivity: []
      })
    }
  }

  const loadSalesData = async (limit = salesLimit) => {
    try {
      let path = '/api/creator/sales-history'
      if (timeRange === 'custom' && customStart && customEnd) {
        path += `?startDate=${customStart}&endDate=${customEnd}&limit=${limit}`
      } else {
        const days = timeRange === '7d' ? 7 : (timeRange === '90d' ? 90 : 30)
        path += `?days=${days}&limit=${limit}`
      }
      
      console.log(`🔄 Loading sales data from: ${path}`)
      const salesRes = await apiFetch(path, { token })
      console.log(`✅ Sales data loaded:`, {
        totalSales: salesRes.totalSales,
        salesCount: salesRes.salesCount,
        dataSource: salesRes.dataSource
      })
      setSalesData(salesRes)
      
    } catch (err) {
      console.error('❌ Failed to load sales data:', err)
      // Set safe defaults with error indication
      setSalesData({
        totalSales: 0,
        salesCount: 0,
        recentSales: [],
        error: true,
        errorMessage: err.message || 'Unable to load sales data'
      })
    }
  }

  const handleDateRangeChange = (range) => {
    setTimeRange(range)
    if (range !== 'custom') {
      setCustomStart('')
      setCustomEnd('')
    }
  }

  const handleCustomDateSubmit = () => {
    if (customStart && customEnd) {
      loadEarningsSummary()
      loadAnalytics()
      loadSalesData()
    }
  }

  const loadMoreSales = () => {
    const newLimit = salesLimit + 20 // Load 20 more at a time
    setSalesLimit(newLimit)
    loadSalesData(newLimit)
  }

  const loadAllSales = () => {
    setSalesLimit('all')
    loadSalesData('all')
  }

  const resetSalesLimit = () => {
    setSalesLimit(10)
    loadSalesData(10)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const handleSaleClick = (sale) => {
    console.log('🔍 Sale clicked:', { productUrl: sale.productUrl, product: sale.product });
    
    // Always show product details modal instead of redirecting
    console.log('📋 Showing product details modal');
    setSelectedSale(sale)
    setShowSaleModal(true)
  }

  const closeSaleModal = () => {
    setShowSaleModal(false)
    setSelectedSale(null)
  }

  const formatPercentage = (value) => {
    return `${parseFloat(value || 0).toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-300 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-80 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Earnings Dashboard
          </h1>
          <p className="text-gray-600">
            Track your commissions, bonuses, and referral earnings
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="mb-8 bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Time Period:</span>
            {['7d', '30d', '90d', 'custom'].map((range) => (
              <button
                key={range}
                onClick={() => handleDateRangeChange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range === '7d' ? '7 Days' : 
                 range === '30d' ? '30 Days' : 
                 range === '90d' ? '90 Days' : 'Custom'}
              </button>
            ))}
            
            {timeRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={handleCustomDateSubmit}
                  disabled={!customStart || !customEnd}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Earnings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Commission Earned */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Commission Earned</h3>
            <p className="text-3xl font-bold mb-2">
              {formatCurrency(earningsSummary.commissionEarned)}
            </p>
            <p className="text-green-100 text-sm">
              Pending + Approved commissions
            </p>
          </div>

          {/* Total Commissionable Sales */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Sales Generated</h3>
            <p className="text-3xl font-bold mb-2">
              {formatCurrency(salesData.totalSales)}
            </p>
            <p className="text-indigo-100 text-sm">
              {salesData.salesCount} commissionable sales
            </p>
          </div>

          {/* Available for Withdraw */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Available for Withdraw</h3>
            <p className="text-3xl font-bold mb-2">
              {formatCurrency(earningsSummary.availableForWithdraw)}
            </p>
            <p className="text-blue-100 text-sm">
              Ready to withdraw
            </p>
          </div>

          {/* Total Earnings */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Total Earnings</h3>
            <p className="text-3xl font-bold mb-2">
              {formatCurrency(earningsSummary.totalEarnings)}
            </p>
            <p className="text-purple-100 text-sm">
              All time earnings
            </p>
          </div>

          {/* Payouts Requested */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Payouts Requested</h3>
            <p className="text-3xl font-bold mb-2">
              {formatCurrency(earningsSummary.payoutsRequested)}
            </p>
            <p className="text-orange-100 text-sm">
              In processing
            </p>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Performance Metrics */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Clicks</span>
                <span className="font-semibold text-gray-900">
                  {analytics.performanceMetrics.clicks.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Conversions</span>
                <span className="font-semibold text-gray-900">
                  {analytics.performanceMetrics.conversions.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Conversion Rate</span>
                <span className="font-semibold text-gray-900">
                  {formatPercentage(analytics.performanceMetrics.conversionRate)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Order Value</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(analytics.performanceMetrics.averageOrderValue)}
                </span>
              </div>
            </div>
          </div>

          {/* Top Performing Links */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Top Performing Links</h3>
            {analytics.topLinks.length > 0 ? (
              <div className="space-y-3">
                {analytics.topLinks.slice(0, 5).map((link, index) => (
                  <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <div className="truncate max-w-32">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {link.url.split('/').pop() || 'Link'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {link.clicks} clicks
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(link.revenue)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatPercentage(link.conversionRate)} CR
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p>No performance data yet</p>
                <p className="text-sm">Start creating links to see analytics</p>
              </div>
            )}
          </div>
        </div>



        {/* Recent Commissionable Sales */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Recent Commissionable Sales</h3>
            {salesData.error && (
              <div className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-full">
                Error loading data
              </div>
            )}
          </div>
          {salesData.recentSales && salesData.recentSales.length > 0 ? (
            <div className="space-y-4">
              {salesData.recentSales.map((sale, index) => (
                <div 
                  key={index} 
                  className="group flex items-center justify-between p-4 bg-gray-50 rounded-lg border-l-4 border-indigo-500 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSaleClick(sale)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {sale.product || 'Product Sale'}
                        <svg className="w-3 h-3 inline ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(sale.date).toLocaleDateString()}
                        <span className="ml-2 text-indigo-500">• Click for details</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(sale.orderValue)}
                    </p>
                    <p className="text-sm text-indigo-600 font-medium">
                      → {formatCurrency(sale.commission)} commission
                    </p>
                  </div>
                </div>
              ))}
              {salesData.salesCount > salesData.recentSales.length && (
                <div className="text-center py-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-4">
                    Showing {salesData.recentSales.length} of {salesData.salesCount} total sales
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={loadMoreSales}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Load 20 More
                    </button>
                    <button
                      onClick={loadAllSales}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                    >
                      Show All ({salesData.salesCount})
                    </button>
                  </div>
                </div>
              )}
              {salesData.salesCount === salesData.recentSales.length && salesData.salesCount > 10 && (
                <div className="text-center py-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-3">
                    Showing all {salesData.salesCount} sales
                  </p>
                  <button
                    onClick={resetSalesLimit}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                  >
                    Show Less (10)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="text-lg font-medium">No commissionable sales yet</p>
              <p className="text-sm">Your sales that generate commission will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Sale Details Modal */}
      {showSaleModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeSaleModal}>
          <div className="bg-white rounded-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Sale Details</h3>
              <button
                onClick={closeSaleModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Product */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedSale.product}</h4>
                  <p className="text-sm text-gray-500">{new Date(selectedSale.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric'
                  })}</p>
                </div>
              </div>

              {/* Sale Information */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Customer Purchase</span>
                  <span className="font-semibold text-lg">{formatCurrency(selectedSale.orderValue)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Your Commission</span>
                  <span className="font-bold text-green-600 text-lg">{formatCurrency(selectedSale.commission)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedSale.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    selectedSale.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedSale.status}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Action ID</span>
                  <span className="font-mono text-xs text-gray-500">{selectedSale.actionId}</span>
                </div>

                {/* Commission Rate */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Commission Rate</span>
                  <span className="text-sm text-gray-700">
                    {((selectedSale.commission / selectedSale.orderValue) * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Sale Date */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Sale Date</span>
                  <span className="text-sm text-gray-700">
                    {new Date(selectedSale.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>



              {/* Commission Details */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">💰 Commission Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Customer Paid:</span>
                    <span className="font-medium text-green-900">{formatCurrency(selectedSale.orderValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Commission Rate:</span>
                    <span className="font-medium text-green-900">
                      {((selectedSale.commission / selectedSale.orderValue) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-green-200 pt-2">
                    <span className="text-green-700 font-medium">Your Earnings:</span>
                    <span className="font-bold text-green-900">{formatCurrency(selectedSale.commission)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-6">
              <button
                onClick={closeSaleModal}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




