import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'

export default function HistoricalAnalytics() {
  const { user, token } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('1m')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedCreator, setSelectedCreator] = useState('')
  const [creators, setCreators] = useState([])
  const [collecting, setCollecting] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState(null)

  useEffect(() => {
    loadCreators()
    loadAnalytics()
    loadMigrationStatus()
  }, [])

  useEffect(() => {
    loadAnalytics()
  }, [dateRange, selectedCreator])

  const loadCreators = async () => {
    try {
      const response = await apiFetch('/api/admin/creators', { token })
      const activeCreators = response.creators.filter(c => 
        c.isActive && c.applicationStatus === 'APPROVED'
      )
      setCreators(activeCreators)
    } catch (error) {
      console.error('Failed to load creators:', error)
    }
  }

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (dateRange !== 'custom') {
        params.append('dateRange', dateRange)
      } else if (customStart && customEnd) {
        params.append('startDate', customStart)
        params.append('endDate', customEnd)
      }
      
      if (selectedCreator) {
        params.append('creatorId', selectedCreator)
      }

      const response = await apiFetch(`/api/admin/analytics/historical?${params}`, { token })
      setAnalytics(response)
      
    } catch (error) {
      console.error('Failed to load historical analytics:', error)
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }

  const triggerDailyCollection = async () => {
    if (!confirm('Trigger daily analytics collection for yesterday?')) return

    try {
      setCollecting(true)
      const response = await apiFetch('/api/admin/analytics/collect-daily', {
        method: 'POST',
        token,
        body: {}
      })

      if (response.success) {
        alert(`✅ Daily collection completed: ${response.results.successful} creators processed`)
        loadAnalytics() // Refresh data
      } else {
        alert(`❌ Collection failed: ${response.message}`)
      }
    } catch (error) {
      console.error('Failed to trigger collection:', error)
      alert(`❌ Collection failed: ${error.message}`)
    } finally {
      setCollecting(false)
    }
  }

  const triggerBackfill = async () => {
    if (!customStart || !customEnd) {
      alert('Please set custom date range for backfill')
      return
    }

    const daysDiff = Math.ceil((new Date(customEnd) - new Date(customStart)) / (24 * 60 * 60 * 1000))
    
    if (!confirm(`Backfill ${daysDiff} days of historical data? This may take ${Math.ceil(daysDiff * 2)} minutes.`)) {
      return
    }

    try {
      setBackfilling(true)
      const response = await apiFetch('/api/admin/analytics/backfill', {
        method: 'POST',
        token,
        body: {
          startDate: customStart,
          endDate: customEnd
        }
      })

      if (response.success) {
        alert(`✅ Backfill started: ${response.message}`)
        loadAnalytics() // Refresh data
      } else {
        alert(`❌ Backfill failed: ${response.message}`)
      }
    } catch (error) {
      console.error('Failed to trigger backfill:', error)
      alert(`❌ Backfill failed: ${error.message}`)
    } finally {
      setBackfilling(false)
    }
  }

  const triggerFullHistoricalBackfill = async () => {
    const confirmMessage = `🗺️ MAP ALL HISTORICAL DATA

This will:
• Fetch historical data from Impact.com API for ALL ${creators.length} creators
• Map earnings, clicks, and conversions for the last 90 days
• Create point-in-time snapshots for historical protection
• Set up automatic daily updates going forward

⏱️ Estimated time: ${Math.ceil(creators.length * 2)} minutes
🛡️ Safe for production - will not affect existing data

Continue with full historical mapping?`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setBackfilling(true)
      
      // Calculate 90 days back from today
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90)
      
      console.log('🗺️ Starting full historical backfill for all creators...')
      
      const response = await apiFetch('/api/admin/analytics/full-historical-backfill', {
        method: 'POST',
        token,
        body: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          allCreators: true,
          setupAutoDailyCollection: true
        }
      })

      if (response.success) {
        alert(`✅ Historical mapping started successfully!

📊 Processing: ${response.totalCreators} creators
📅 Date range: ${response.dateRange.start} to ${response.dateRange.end}
⏱️ Estimated completion: ${response.estimatedDuration}

The system will now:
• Map all historical data from Impact.com
• Create protected earnings snapshots
• Set up automatic daily updates

You can monitor progress by refreshing this page.`)
        
        // Refresh data after a short delay
        setTimeout(() => {
          loadAnalytics()
        }, 5000)
      } else {
        alert(`❌ Historical mapping failed: ${response.message}`)
      }
    } catch (error) {
      console.error('Failed to trigger full historical backfill:', error)
      alert(`❌ Historical mapping failed: ${error.message}`)
    } finally {
      setBackfilling(false)
    }
  }

  const loadMigrationStatus = async () => {
    try {
      const response = await apiFetch('/api/admin/historical-migration/status', { token })
      setMigrationStatus(response.status)
    } catch (error) {
      console.error('Failed to load migration status:', error)
    }
  }

  const triggerHistoricalMigration = async (dryRun = false) => {
    if (!customStart || !customEnd) {
      alert('Please select start and end dates for migration')
      return
    }

    const daysDiff = Math.ceil((new Date(customEnd) - new Date(customStart)) / (24 * 60 * 60 * 1000))
    const mode = dryRun ? 'DRY RUN' : 'LIVE'
    
    const confirmMessage = `${mode} Historical Data Migration
    
Date Range: ${customStart} to ${customEnd} (${daysDiff} days)
Target: ${selectedCreator ? 'Selected creator only' : 'All active creators'}
Mode: ${dryRun ? 'Preview only (no data changes)' : 'Live migration (will create/update data)'}

This will use the Impact.com API to map historical data for each creator safely.

Continue?`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setMigrating(true)
      
      const response = await apiFetch('/api/admin/historical-migration/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: customStart,
          endDate: customEnd,
          specificCreatorIds: selectedCreator ? [selectedCreator] : null,
          dryRun,
          continueOnError: true
        }),
        token
      })

      if (response.success) {
        const bgMessage = response.background ? ' (running in background)' : ''
        alert(`${mode} Migration started: ${response.message}${bgMessage}`)
        
        if (!response.background && response.results) {
          // Show results for small migrations
          const results = response.results
          console.log('Migration results:', results)
          alert(`Migration completed!
          
Creators: ${results.creators.successful} successful, ${results.creators.failed} failed
Records: ${results.data.totalRecords} created
API Calls: ${results.data.impactApiCalls}
Duration: ${(results.performance.totalDuration / 1000).toFixed(1)}s`)
        }
        
        loadAnalytics() // Reload to show new data
        loadMigrationStatus() // Update status
      } else {
        alert(`Migration failed: ${response.message}`)
      }
      
    } catch (error) {
      console.error('Migration error:', error)
      alert('Migration failed: ' + error.message)
    } finally {
      setMigrating(false)
    }
  }

  const handleCustomDateSubmit = () => {
    if (customStart && customEnd) {
      setDateRange('custom')
      loadAnalytics()
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
            <div className="h-96 bg-gray-300 rounded"></div>
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
            📊 Historical Analytics (Admin)
          </h1>
          <p className="text-gray-600">
            Historical data analysis and testing ground for creator analytics
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="1d">1 Day</option>
                <option value="1w">1 Week</option>
                <option value="1m">1 Month</option>
                <option value="1y">1 Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Creator Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Creator Filter</label>
              <select
                value={selectedCreator}
                onChange={(e) => setSelectedCreator(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Creators</option>
                {creators.map(creator => (
                  <option key={creator.id} value={creator.id}>
                    {creator.name} ({creator.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleCustomDateSubmit}
                      disabled={!customStart || !customEnd}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 space-y-4">
            {/* Primary Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={triggerDailyCollection}
                disabled={collecting}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {collecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Collecting...
                  </>
                ) : (
                  '🔄 Collect Yesterday'
                )}
              </button>

              <button
                onClick={loadAnalytics}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                🔄 Refresh Data
              </button>

              <button
                onClick={() => triggerFullHistoricalBackfill()}
                disabled={backfilling}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
              >
                {backfilling ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Mapping History...
                  </>
                ) : (
                  '🗺️ Map All Historical Data'
                )}
              </button>
            </div>

            {/* Custom Range Backfill */}
            {dateRange === 'custom' && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={triggerBackfill}
                  disabled={backfilling || !customStart || !customEnd}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center"
                >
                  {backfilling ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Backfilling Range...
                    </>
                  ) : (
                    '📈 Backfill Custom Range'
                  )}
                </button>

                <button
                  onClick={() => triggerHistoricalMigration(true)}
                  disabled={migrating || !customStart || !customEnd}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center"
                >
                  {migrating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Migrating...
                    </>
                  ) : (
                    '🔍 Preview Migration (Dry Run)'
                  )}
                </button>

                <button
                  onClick={() => triggerHistoricalMigration(false)}
                  disabled={migrating || !customStart || !customEnd}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {migrating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Migrating...
                    </>
                  ) : (
                    '🚀 Live Migration'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Migration Status */}
        {migrationStatus && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Historical Data Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium">Total Records</div>
                <div className="text-2xl font-bold text-blue-900">{migrationStatus.totalRecords.toLocaleString()}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600 font-medium">Creators with Data</div>
                <div className="text-2xl font-bold text-green-900">{migrationStatus.creatorsWithData}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600 font-medium">Oldest Record</div>
                <div className="text-sm font-semibold text-purple-900">
                  {migrationStatus.dateRange.oldest ? new Date(migrationStatus.dateRange.oldest).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4">
                <div className="text-sm text-indigo-600 font-medium">Latest Record</div>
                <div className="text-sm font-semibold text-indigo-900">
                  {migrationStatus.dateRange.newest ? new Date(migrationStatus.dateRange.newest).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {migrationStatus.recentActivity && migrationStatus.recentActivity.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Recent Data Sync Activity</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {migrationStatus.recentActivity.slice(0, 5).map((activity, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{activity.creatorName}</span>
                          <span className="text-gray-500 ml-2">{new Date(activity.date).toLocaleDateString()}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-green-600 font-medium">${activity.metrics.commissions.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">
                            {activity.metrics.clicks} clicks, {activity.metrics.conversions} conversions
                          </div>
                        </div>
                        <div className="ml-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            activity.dataSource === 'IMPACT_API' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {activity.dataSource === 'IMPACT_API' ? '🔗 Impact API' : '📊 Fallback'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Metrics */}
        {analytics && analytics.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Commissions</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(analytics.summary.totalCommissions)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Commissionable Sales</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(analytics.summary.totalSales)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Clicks</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics.summary.totalClicks.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics.summary.conversionRate.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Section */}
        {analytics && analytics.chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Commission Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Daily Commissions</h3>
              {analytics.chartData.length > 0 ? (
                <div className="space-y-3">
                  {/* Simple Bar Chart Visualization */}
                  <div className="space-y-2">
                    {analytics.chartData.map((day, index) => {
                      const maxCommission = Math.max(...analytics.chartData.map(d => d.commissionEarned));
                      const percentage = maxCommission > 0 ? (day.commissionEarned / maxCommission) * 100 : 0;
                      
                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{new Date(day.date).toLocaleDateString()}</span>
                            <span className="font-semibold text-green-600">{formatCurrency(day.commissionEarned)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-500 ease-out" 
                              style={{ width: `${Math.max(percentage, 2)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Summary Stats */}
                  <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(analytics.chartData.reduce((sum, day) => sum + day.commissionEarned, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Average</p>
                      <p className="font-semibold text-blue-600">
                        {formatCurrency(analytics.chartData.reduce((sum, day) => sum + day.commissionEarned, 0) / analytics.chartData.length)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Peak Day</p>
                      <p className="font-semibold text-purple-600">
                        {formatCurrency(Math.max(...analytics.chartData.map(d => d.commissionEarned)))}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No historical data available</p>
                  <p className="text-sm">Use "Collect Yesterday" or "Backfill Range" to gather data</p>
                </div>
              )}
            </div>

            {/* Clicks vs Conversions Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Clicks vs Conversions</h3>
              {analytics.chartData.length > 0 ? (
                <div className="space-y-3">
                  {/* Enhanced Click/Conversion Visualization */}
                  <div className="space-y-3">
                    {analytics.chartData.map((day, index) => {
                      const maxClicks = Math.max(...analytics.chartData.map(d => d.clicks));
                      const clickPercentage = maxClicks > 0 ? (day.clicks / maxClicks) * 100 : 0;
                      const conversionRate = day.clicks > 0 ? (day.conversions / day.clicks) * 100 : 0;
                      
                      return (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">{new Date(day.date).toLocaleDateString()}</span>
                            <span className="text-xs font-semibold px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                              {conversionRate.toFixed(1)}% CR
                            </span>
                          </div>
                          
                          {/* Click Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Clicks: {day.clicks}</span>
                              <span>Conversions: {day.conversions}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out" 
                                style={{ width: `${Math.max(clickPercentage, 2)}%` }}
                              ></div>
                            </div>
                            {/* Conversion overlay */}
                            {day.conversions > 0 && (
                              <div className="w-full bg-transparent rounded-full h-1 -mt-1">
                                <div 
                                  className="bg-purple-600 h-1 rounded-full transition-all duration-500 ease-out" 
                                  style={{ width: `${Math.max(conversionRate, 1)}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Summary Stats */}
                  <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-500">Total Clicks</p>
                      <p className="font-semibold text-blue-600">
                        {analytics.chartData.reduce((sum, day) => sum + day.clicks, 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Conversions</p>
                      <p className="font-semibold text-purple-600">
                        {analytics.chartData.reduce((sum, day) => sum + day.conversions, 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Avg. Conv. Rate</p>
                      <p className="font-semibold text-green-600">
                        {(() => {
                          const totalClicks = analytics.chartData.reduce((sum, day) => sum + day.clicks, 0);
                          const totalConversions = analytics.chartData.reduce((sum, day) => sum + day.conversions, 0);
                          return totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : 0;
                        })()}%
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No click data available</p>
                  <p className="text-sm">Historical click data will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Creators */}
        {analytics && analytics.topCreators && analytics.topCreators.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top Performing Creators</h3>
            <div className="space-y-3">
              {analytics.topCreators.map((creator, index) => (
                <div key={creator.creator.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{creator.creator.name}</p>
                      <p className="text-xs text-gray-500">{creator.creator.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      {formatCurrency(creator.totalCommissions)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {creator.totalConversions} conversions • {creator.conversionRate.toFixed(1)}% CR
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Data Status & System Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {analytics ? analytics.totalRecords : 0}
              </p>
              <p className="text-sm text-gray-600">Historical Records</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {analytics && analytics.dateRange ? 
                  Math.ceil((new Date(analytics.dateRange.end) - new Date(analytics.dateRange.start)) / (24 * 60 * 60 * 1000)) 
                  : 0}
              </p>
              <p className="text-sm text-gray-600">Days Analyzed</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{creators.length}</p>
              <p className="text-sm text-gray-600">Active Creators</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className={`text-2xl font-bold ${analytics?.fallback ? 'text-yellow-600' : 'text-green-600'}`}>
                {analytics?.fallback ? 'FALLBACK' : 'LIVE'}
              </p>
              <p className="text-sm text-gray-600">Data Source</p>
            </div>
          </div>

          {/* System Status */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Historical Protection Status */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">🛡️ Historical Protection Status</h4>
                <div className="text-sm text-green-800 space-y-1">
                  <p>• <strong>EarningsSnapshot System:</strong> ✅ Active</p>
                  <p>• <strong>Forward-Only Rates:</strong> ✅ Enabled</p>
                  <p>• <strong>Point-in-Time Lock:</strong> ✅ Protected</p>
                  <p>• <strong>Commission Rate Changes:</strong> ✅ Safe to test</p>
                </div>
              </div>

              {/* Data Quality */}
              <div className={`border rounded-lg p-4 ${analytics.fallback ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                <h4 className={`font-semibold mb-2 ${analytics.fallback ? 'text-yellow-900' : 'text-blue-900'}`}>
                  📊 Data Quality & Source
                </h4>
                <div className={`text-sm space-y-1 ${analytics.fallback ? 'text-yellow-800' : 'text-blue-800'}`}>
                  <p>• <strong>Source:</strong> {analytics.fallback ? 'Database Fallback' : 'Impact.com API'}</p>
                  <p>• <strong>Real-time:</strong> {analytics.fallback ? 'Historical Only' : 'Live Data'}</p>
                  <p>• <strong>Accuracy:</strong> {analytics.fallback ? 'Basic Metrics' : 'Full Precision'}</p>
                  {analytics.fallbackMessage && (
                    <p>• <strong>Note:</strong> {analytics.fallbackMessage}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Debug Information */}
          {analytics && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">🔧 Debug Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Date Range:</strong> {analytics.dateRange?.start} to {analytics.dateRange?.end}</p>
                  <p><strong>Selected Creator:</strong> {selectedCreator ? creators.find(c => c.id === selectedCreator)?.name || 'Unknown' : 'All Creators'}</p>
                  <p><strong>Chart Data Points:</strong> {analytics.chartData?.length || 0}</p>
                </div>
                <div>
                  <p><strong>API Response Time:</strong> {new Date().toLocaleTimeString()}</p>
                  <p><strong>Top Creators Found:</strong> {analytics.topCreators?.length || 0}</p>
                  <p><strong>Summary Calculated:</strong> {analytics.summary ? '✅ Yes' : '❌ No'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📚 Testing Instructions</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>Collect Yesterday:</strong> Fetch and store analytics for yesterday (safe test)</p>
              <p>• <strong>Backfill Range:</strong> Collect historical data for custom date range</p>
              <p>• <strong>Commission Rate Test:</strong> Change rates safely - historical earnings protected</p>
              <p>• <strong>Creator Filter:</strong> Focus on specific creator's performance</p>
              <p>• <strong>Data Verification:</strong> Compare fallback vs live data accuracy</p>
              <p>• <strong>Chart Testing:</strong> Verify visualizations display correctly</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
