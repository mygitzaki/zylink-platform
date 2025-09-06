import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function Analytics() {
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
  const [salesChartData, setSalesChartData] = useState({
    labels: [],
    datasets: []
  })
  const [commissionChartData, setCommissionChartData] = useState({
    labels: [],
    datasets: []
  })
  const [salesData, setSalesData] = useState({
    totalSales: 0,
    salesCount: 0,
    recentSales: []
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    loadEarningsSummary()
    loadAnalytics()
    loadSalesData()
  }, [timeRange, customStart, customEnd])

  const loadEarningsSummary = async () => {
    try {
      setLoading(true)
      let path = '/api/creator/earnings-summary'
      if (timeRange === 'custom' && customStart && customEnd) {
        // Convert date format from MM/DD/YYYY to YYYY-MM-DD for API
        const startDate = new Date(customStart).toISOString().split('T')[0]
        const endDate = new Date(customEnd).toISOString().split('T')[0]
        path += `?startDate=${startDate}&endDate=${endDate}`
      } else {
        const days = timeRange === '7d' ? 7 : 30
        path += `?days=${days}`
      }
      
      const summaryRes = await apiFetch(path, { token })
      setEarningsSummary(summaryRes)
      
    } catch (err) {
      console.error('Failed to load earnings summary:', err)
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
        // Convert date format from MM/DD/YYYY to YYYY-MM-DD for API
        const startDate = new Date(customStart).toISOString().split('T')[0]
        const endDate = new Date(customEnd).toISOString().split('T')[0]
        path += `?startDate=${startDate}&endDate=${endDate}`
        console.log('🔍 [AnalyticsV2] Custom date range API call:', path)
        console.log('🔍 [AnalyticsV2] Original dates:', { customStart, customEnd })
        console.log('🔍 [AnalyticsV2] Converted dates:', { startDate, endDate })
      } else {
        const days = timeRange === '7d' ? 7 : 30
        path += `?days=${days}`
        console.log('🔍 [AnalyticsV2] Standard date range API call:', path)
      }
      
      const analyticsRes = await apiFetch(path, { token })
      console.log('🔍 [AnalyticsV2] Analytics API response:', analyticsRes)
      setAnalytics(analyticsRes)
      
      // Process chart data
      console.log('🔍 [AnalyticsV2] Processing chart data...')
      console.log('🔍 [AnalyticsV2] earningsTrend:', analyticsRes.earningsTrend)
      
      if (analyticsRes.earningsTrend && analyticsRes.earningsTrend.length > 0) {
        console.log('🔍 [AnalyticsV2] Found earnings trend data, processing...')
        console.log('🔍 [AnalyticsV2] First earnings trend item:', analyticsRes.earningsTrend[0])
        console.log('🔍 [AnalyticsV2] All earnings trend items:', analyticsRes.earningsTrend.map(item => ({
          date: item.date,
          revenue: item.revenue,
          commission: item.commission,
          clicks: item.clicks,
          conversions: item.conversions
        })))
        
        const labels = analyticsRes.earningsTrend.map(item => {
          const date = new Date(item.date)
          if (timeRange === '7d') {
            return date.toLocaleDateString('en-US', { weekday: 'short' })
          } else if (timeRange === '30d') {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          } else if (timeRange === 'custom') {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }
        })
        
        console.log('🔍 [AnalyticsV2] Generated labels:', labels)

        const revenueData = analyticsRes.earningsTrend.map(item => item.revenue || 0)
        const commissionData = analyticsRes.earningsTrend.map(item => item.commission || 0)
        
        console.log('🔍 [AnalyticsV2] Extracted revenue data:', revenueData)
        console.log('🔍 [AnalyticsV2] Extracted commission data:', commissionData)
        
        // Create separate charts for each metric
        const salesChart = {
          labels,
          datasets: [
            {
              label: 'Sales',
              data: revenueData,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#3b82f6',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointHoverBackgroundColor: '#3b82f6',
              pointHoverBorderColor: '#ffffff',
              pointHoverBorderWidth: 3
            }
          ]
        }

        const commissionChart = {
          labels,
          datasets: [
            {
              label: 'Commission',
              data: commissionData,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.4,
              borderWidth: 2,
              pointBackgroundColor: '#3b82f6',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointHoverBackgroundColor: '#3b82f6',
              pointHoverBorderColor: '#ffffff',
              pointHoverBorderWidth: 3
            }
          ]
        }

        
        console.log('🔍 [AnalyticsV2] Setting separate chart data')
        setSalesChartData(salesChart)
        setCommissionChartData(commissionChart)
      } else {
        // Generate sample data if no real data
        console.log('🔍 [AnalyticsV2] No real data found, generating sample data...')
        let days, startDate, endDate
        
        if (timeRange === 'custom' && customStart && customEnd) {
          startDate = new Date(customStart)
          endDate = new Date(customEnd)
          days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
          console.log('🔍 [AnalyticsV2] Custom date range sample data:', { startDate, endDate, days })
        } else {
          days = timeRange === '7d' ? 7 : 30
          endDate = new Date()
          startDate = new Date()
          startDate.setDate(endDate.getDate() - (days - 1))
          console.log('🔍 [AnalyticsV2] Standard date range sample data:', { startDate, endDate, days })
        }
        
        const labels = []
        const revenueData = []
        const commissionData = []
        
        for (let i = 0; i < days; i++) {
          const date = new Date(startDate)
          date.setDate(startDate.getDate() + i)
          
          if (timeRange === '7d') {
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }))
          } else {
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
          }
          
          // Generate sample data with some variation
          const baseRevenue = 50 + Math.random() * 100
          const baseCommission = baseRevenue * 0.7
          revenueData.push(Math.round(baseRevenue * 100) / 100)
          commissionData.push(Math.round(baseCommission * 100) / 100)
        }
        
        // Create separate sample charts
        const sampleSalesChart = {
          labels,
          datasets: [
            {
              label: 'Sales',
              data: revenueData,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#3b82f6',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
            }
          ]
        }

        const sampleCommissionChart = {
          labels,
          datasets: [
            {
              label: 'Commission',
              data: commissionData,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.4,
              borderWidth: 2,
              pointBackgroundColor: '#3b82f6',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
            }
          ]
        }

        
        console.log('🔍 [AnalyticsV2] Setting sample chart data')
        setSalesChartData(sampleSalesChart)
        setCommissionChartData(sampleCommissionChart)
      }
      
    } catch (err) {
      console.error('Failed to load analytics:', err)
      setAnalytics({
        earningsTrend: [],
        performanceMetrics: { clicks: 0, conversions: 0, revenue: 0, conversionRate: 0 },
        topLinks: [],
        recentActivity: []
      })
    }
  }

  const loadSalesData = async () => {
    try {
      let path = '/api/creator/sales-history'
      if (timeRange === 'custom' && customStart && customEnd) {
        // Convert date format from MM/DD/YYYY to YYYY-MM-DD for API
        const startDate = new Date(customStart).toISOString().split('T')[0]
        const endDate = new Date(customEnd).toISOString().split('T')[0]
        path += `?startDate=${startDate}&endDate=${endDate}&limit=10`
      } else {
        const days = timeRange === '7d' ? 7 : 30
        path += `?days=${days}&limit=10`
      }
      
      const salesRes = await apiFetch(path, { token })
      setSalesData(salesRes)
      
    } catch (err) {
      console.error('Failed to load sales data:', err)
      setSalesData({
        totalSales: 0,
        salesCount: 0,
        recentSales: []
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0)
  }

  const getDateRangeText = () => {
    if (timeRange === 'custom' && customStart && customEnd) {
      return `${customStart} - ${customEnd}`
    }
    const now = new Date()
    const days = timeRange === '7d' ? 7 : 30
    const startDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
    return `${startDate.toISOString().split('T')[0]} - ${now.toISOString().split('T')[0]}`
  }

  const getChartOptions = (chartType) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#000000',
        bodyColor: '#000000',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label
            const value = context.parsed.y
            return `${label}: ${formatCurrency(value)}`
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#666666',
          font: {
            size: 11
          }
        },
        grid: {
          color: '#f3f4f6',
          drawBorder: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#666666',
          font: {
            size: 11
          },
          callback: function(value) {
            return '$' + value.toFixed(0)
          }
        },
        grid: {
          color: '#f3f4f6',
          drawBorder: false
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Analytics
          </h1>
          <p className="text-gray-600">
            {getDateRangeText()}
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="mb-8 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Time Period:</span>
            {['7d', '30d', 'custom'].map((range) => (
              <button
                key={range}
                onClick={() => handleDateRangeChange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range === '7d' ? 'Last 7 days' : 
                 range === '30d' ? 'Last 30 days' : 'Custom'}
              </button>
            ))}
            
            {timeRange === 'custom' && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
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
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Sales Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Sales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(salesData.totalSales)}
                </p>
                <p className="text-xs text-gray-500 mt-1">View your sales over time.</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Commission Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Commissions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(earningsSummary.commissionEarned)}
                </p>
                <p className="text-xs text-gray-500 mt-1">See how much you've earned in commission.</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Clicks Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Clicks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(analytics.performanceMetrics.clicks)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Track your link performance.</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Conversion Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Conversion</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.performanceMetrics.conversionRate ? 
                    parseFloat(analytics.performanceMetrics.conversionRate).toFixed(2) + '%' : 
                    '0.00%'
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">Your conversion rate.</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Separate Charts - Sales and Commissions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Sales</h3>
                <p className="text-sm text-gray-600">View your sales over time.</p>
              </div>
            </div>
            <div className="h-64">
              {salesChartData.labels.length > 0 ? (
                <Line data={salesChartData} options={getChartOptions('sales')} />
              ) : (
                <div className="h-full bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">Loading sales data...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Commission Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Commissions</h3>
                <p className="text-sm text-gray-600">See how much you've earned in commission.</p>
              </div>
            </div>
            <div className="h-64">
              {commissionChartData.labels.length > 0 ? (
                <Line data={commissionChartData} options={getChartOptions('commission')} />
              ) : (
                <div className="h-full bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">Loading commission data...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>


        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                <span className="text-black">Loading analytics...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
