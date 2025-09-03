import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'

export default function QuickHistoricalAnalytics() {
  const { user, token } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('1m')
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Use existing analytics endpoint as fallback
      const response = await apiFetch('/api/analytics/platform', { token })
      setAnalytics(response)
      
    } catch (error) {
      console.error('Failed to load analytics:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-300 rounded"></div>
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
            📊 Historical Analytics (Admin Testing)
          </h1>
          <p className="text-gray-600">
            Platform analytics testing ground - will be enhanced with daily data collection
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800">Database Schema Update Required</h3>
            <p className="text-red-700 text-sm mt-1">
              The DailyAnalytics table needs to be created. Run: <code className="bg-red-100 px-2 py-1 rounded">npx prisma db push</code>
            </p>
          </div>
        )}

        {/* Current Platform Analytics (Existing Data) */}
        {analytics && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Current Platform Metrics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {analytics.overview?.creators || 0}
                  </p>
                  <p className="text-sm text-gray-600">Total Creators</p>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {analytics.overview?.clicks?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-gray-600">Total Clicks</p>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {analytics.overview?.conversions?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-gray-600">Total Conversions</p>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(analytics.earnings?.totalCreatorPayouts || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Creator Payouts</p>
                </div>
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-blue-900 mb-4">🔧 Setup Required</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Step 1: Create Database Table</h4>
                  <p className="text-blue-700 text-sm mb-2">
                    The DailyAnalytics table needs to be created in your database.
                  </p>
                  <code className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
                    cd backend && npx prisma db push
                  </code>
                </div>

                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Step 2: Start Data Collection</h4>
                  <p className="text-blue-700 text-sm">
                    Once the table is created, use the "Collect Yesterday" button to start gathering historical data.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Step 3: Test and Verify</h4>
                  <p className="text-blue-700 text-sm">
                    Verify data accuracy in this admin dashboard before rolling out to creators.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Earnings Breakdown */}
            {analytics.earnings && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Current Earnings Overview</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">Completed Earnings</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(analytics.earnings.completed?.amount || 0)}
                    </p>
                    <p className="text-sm text-green-700">
                      {analytics.earnings.completed?.count || 0} transactions
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">Pending Earnings</h4>
                    <p className="text-2xl font-bold text-yellow-600">
                      {formatCurrency(analytics.earnings.pending?.amount || 0)}
                    </p>
                    <p className="text-sm text-yellow-700">
                      {analytics.earnings.pending?.count || 0} transactions
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Eligible Creators</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {analytics.eligibility?.eligibleCreators || 0}
                    </p>
                    <p className="text-sm text-blue-700">
                      Above ${analytics.eligibility?.minimumPayout || 50} minimum
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <div className="font-medium">🔄 Refresh Data</div>
              <div className="text-sm opacity-90">Reload current analytics</div>
            </button>

            <button
              onClick={() => alert('Run: cd backend && npx prisma db push')}
              className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              <div className="font-medium">🔧 Setup Database</div>
              <div className="text-sm opacity-90">Create DailyAnalytics table</div>
            </button>

            <button
              onClick={() => window.open('/admin/email-management', '_blank')}
              className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <div className="font-medium">📧 Email Center</div>
              <div className="text-sm opacity-90">Send creator communications</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
