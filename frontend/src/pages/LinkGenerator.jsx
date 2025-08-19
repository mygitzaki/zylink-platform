import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'
import { useNavigate } from 'react-router-dom'
// Import new Zylike-inspired UI components
import { Button, Card, Container, Input, Skeleton } from '../components/ui'

export default function LinkGenerator() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [productUrl, setProductUrl] = useState('')
  const [generatedLink, setGeneratedLink] = useState(null)
  const [urlValidation, setUrlValidation] = useState({ isValid: true, message: '' })
  const [dashboardData, setDashboardData] = useState({
    totalLinks: 0,
    totalEarnings: 0,
    conversionRate: 0,
    todayClicks: 0,
    todayEarnings: 0,
    recentLinks: []
  })
  const [dataLoading, setDataLoading] = useState(true)

  // Load dashboard data on component mount
  useEffect(() => {
    if (token) {
      loadDashboardData()
    }
  }, [token])

  const loadDashboardData = async () => {
    try {
      setDataLoading(true)
      
      // Try direct API calls first to bypass Vercel rewrite issues
      let analyticsRes, earningsRes, linksRes
      
      try {
        console.log('🌐 Loading dashboard data via direct API calls...')
        const [analyticsPromise, earningsPromise, linksPromise] = [
          fetch('https://zylink-platform-production.up.railway.app/api/creator/analytics', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('https://zylink-platform-production.up.railway.app/api/creator/earnings', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('https://zylink-platform-production.up.railway.app/api/creator/links', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]
        
        const [analyticsResponse, earningsResponse, linksResponse] = await Promise.all([
          analyticsPromise, earningsPromise, linksPromise
        ])
        
        analyticsRes = await analyticsResponse.json()
        earningsRes = await earningsResponse.json()
        linksRes = await linksResponse.json()
        
        console.log('✅ Direct API calls successful')
      } catch (directError) {
        console.log('⚠️ Direct API calls failed, trying Vercel rewrite...')
        
        // Fallback to Vercel rewrite
        [analyticsRes, earningsRes, linksRes] = await Promise.all([
          apiFetch('/api/creator/analytics', { token }),
          apiFetch('/api/creator/earnings', { token }),
          apiFetch('/api/creator/links', { token })
        ])
      }
      
      setDashboardData({
        totalLinks: linksRes.links?.length || 0,
        totalEarnings: earningsRes.total || 0,
        conversionRate: analyticsRes.clicks > 0 ? ((analyticsRes.conversions || 0) / analyticsRes.clicks * 100) : 0,
        todayClicks: analyticsRes.todayClicks || 0,
        todayEarnings: earningsRes.today || 0,
        recentLinks: linksRes.links?.slice(0, 3) || []
      })
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!productUrl.trim()) return
    
    setLoading(true)
    setError('')
    setGeneratedLink(null)
    
    try {
      console.log('🔗 Attempting to generate link for:', productUrl)
      console.log('🔑 Token available:', !!token)
      
      // Try direct API call first (bypass Vercel rewrite rules)
      let result
      try {
        console.log('🌐 Trying direct API call...')
        result = await fetch('https://zylink-platform-production.up.railway.app/api/creator/links', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ destinationUrl: productUrl })
        })
        
        if (!result.ok) {
          throw new Error(`HTTP ${result.status}: ${result.statusText}`)
        }
        
        result = await result.json()
        console.log('✅ Direct API call successful:', result)
      } catch (directError) {
        console.log('⚠️ Direct API call failed, trying Vercel rewrite...')
        
        // Fallback to Vercel rewrite
        result = await apiFetch('/api/creator/links', {
          method: 'POST',
          body: { destinationUrl: productUrl },
          token
        })
        
        console.log('✅ Vercel rewrite successful:', result)
      }
      
      // Extract the link data from the response
      setGeneratedLink(result.link)
      setSuccess('Link generated successfully!')
      setProductUrl('')
      
      // Refresh dashboard data to show new link
      await loadDashboardData()
      
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      console.error('❌ Link generation failed:', err)
      console.error('❌ Error details:', {
        message: err.message,
        status: err.status,
        response: err.response
      })
      
      if (err.status === 401) {
        setError('Session expired. Please log in again.')
        // Redirect to login after a delay
        setTimeout(() => navigate('/login'), 2000)
      } else {
        setError(err.message || 'Failed to generate link')
      }
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text, linkType) => {
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setSuccess(`${linkType} copied to clipboard!`)
          setTimeout(() => setSuccess(''), 3000)
        })
        .catch(() => {
          // Fallback to old method
          fallbackCopyTextToClipboard(text, linkType)
        })
    } else {
      // Fallback for older browsers
      fallbackCopyTextToClipboard(text, linkType)
    }
  }

  const fallbackCopyTextToClipboard = (text, linkType) => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      setSuccess(`${linkType} copied to clipboard!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to copy to clipboard')
      setTimeout(() => setError(''), 3000)
    }
    
    document.body.removeChild(textArea)
  }

  // Helper function to truncate long URLs for display
  const truncateUrl = (url, maxLength = 50) => {
    if (!url || url.length <= maxLength) return url
    const start = url.substring(0, 25)
    const end = url.substring(url.length - 20)
    return `${start}...${end}`
  }

  // URL validation helper
  const validateUrl = (url) => {
    if (!url.trim()) {
      return { isValid: true, message: '' }
    }
    
    try {
      const urlObj = new URL(url)
      
      // Check if it's HTTP/HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { isValid: false, message: 'URL must start with http:// or https://' }
      }
      
      // Check for common shopping sites
      const supportedDomains = ['walmart.com', 'target.com', 'amazon.com', 'bestbuy.com', 'homedepot.com']
      const domain = urlObj.hostname.replace('www.', '')
      const isSupported = supportedDomains.some(d => domain.includes(d))
      
      if (isSupported) {
        return { isValid: true, message: '✅ Supported retailer detected' }
      } else {
        return { isValid: true, message: '⚠️ This site may have limited tracking support' }
      }
    } catch {
      return { isValid: false, message: 'Please enter a valid URL (e.g., https://walmart.com/product)' }
    }
  }

  // Handle URL input change with validation
  const handleUrlChange = (e) => {
    const url = e.target.value
    setProductUrl(url)
    const validation = validateUrl(url)
    setUrlValidation(validation)
  }

  const handleQuickAction = (action) => {
    switch (action) {
      case 'analytics':
        navigate('/analytics')
        break
      case 'manage-links':
        navigate('/my-links')
        break
      case 'referrals':
        navigate('/referrals')
        break
      default:
        break
    }
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <Container className="py-4 sm:py-6 lg:py-8">
          <div className="space-y-8 animate-fadeIn">
            {/* Hero skeleton */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton variant="text" className="w-1/3 h-8" />
              </div>
              <Skeleton variant="text" className="w-1/2 h-4" />
              
              {/* Stats skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton.Metric key={i} />
                ))}
              </div>
            </div>
            
            {/* Link form skeleton */}
            <Skeleton.LinkForm />
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <Container className="py-4 sm:py-6 lg:py-8 animate-fadeIn">
        {/* Hero Section */}
        <div className="mb-6 sm:mb-8 animate-slideIn">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
            🎉 NEW UI! Welcome back, <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">{user?.name || 'Creator'}!</span> ✨
          </h1>
          <p className="text-purple-200 text-sm sm:text-base lg:text-lg">
            Transform your audience into revenue with powerful affiliate links
          </p>
          {/* Stats Cards - Zylike Style */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <Card variant="glass" hover className="group">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{dashboardData.totalLinks}</p>
                  <p className="text-sm text-white/60">Active Links</p>
                </div>
              </div>
            </Card>
            
            <Card variant="glass" hover className="group">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">${dashboardData.totalEarnings.toFixed(2)}</p>
                  <p className="text-sm text-white/60">Total Earnings</p>
                </div>
              </div>
            </Card>
            
            <Card variant="glass" hover className="group">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{dashboardData.conversionRate.toFixed(1)}%</p>
                  <p className="text-sm text-white/60">Conversion Rate</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Link Generation Form - Zylike Style */}
        <Card variant="gradient" className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-accent-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-white text-2xl">🔗</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Affiliate Link Generator</h2>
              <p className="text-purple-200 text-sm sm:text-base">Create high-converting affiliate links in seconds</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <Input
                type="url"
                value={productUrl}
                onChange={handleUrlChange}
                placeholder="https://walmart.com/product/example"
                label="Product URL"
                error={!urlValidation.isValid ? urlValidation.message : ''}
                className="flex-1"
                required
              />
              <Button 
                type="submit" 
                disabled={loading || !productUrl.trim()}
                loading={loading}
                size="lg"
                className="w-full sm:w-auto sm:min-w-[150px] self-end"
              >
                {!loading && (
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
                Generate Link
              </Button>
            </div>
            {urlValidation.message && urlValidation.isValid && (
              <div className="text-green-400 text-sm flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{urlValidation.message}</span>
              </div>
            )}
          </form>
        </Card>

        {/* Generated Link Display - Zylike Style */}
        {generatedLink && (
          <Card variant="glass-strong" className="mb-8 animate-scaleIn">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl">
                <span className="text-white text-2xl">🎉</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Your Link is Ready!</h3>
              <p className="text-purple-200">Share this link to start earning commissions</p>
            </div>

            {/* Primary Link Card */}
            <Card variant="gradient" className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">✨</span>
                    <span className="text-purple-300 font-semibold">Share This Link</span>
                  </div>
                  <p className="text-white text-lg font-mono break-all mb-2 p-3 bg-black/20 rounded-lg border border-white/10">
                    {generatedLink.shortLink}
                  </p>
                  <p className="text-purple-200 text-sm">Clean, branded link perfect for social media</p>
                </div>
                
                <Button
                  onClick={() => copyToClipboard(generatedLink.shortLink, 'Short link')}
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </Button>
              </div>
            </Card>
          </Card>
        )}

        {/* Quick Actions - Zylike Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card variant="glass" hover className="group">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">View Analytics</h3>
                <p className="text-purple-200 text-sm">Deep dive into performance</p>
              </div>
            </div>
            <Button 
              onClick={() => handleQuickAction('analytics')}
              variant="secondary"
              className="w-full"
            >
              View Analytics
            </Button>
          </Card>

          <Card variant="glass" hover className="group">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Referral Program</h3>
                <p className="text-purple-200 text-sm">Invite friends, earn 10%</p>
              </div>
            </div>
            <Button 
              onClick={() => handleQuickAction('referrals')}
              variant="secondary"
              className="w-full"
            >
              Invite Friends
            </Button>
          </Card>
        </div>

        {/* Recent Links - if any */}
        {dashboardData.recentLinks.length > 0 && (
          <Card variant="glass" className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Recent Links</h3>
              <Button
                onClick={() => handleQuickAction('manage-links')}
                variant="ghost"
                size="sm"
              >
                View All →
              </Button>
            </div>
            <div className="space-y-4">
              {dashboardData.recentLinks.map((link, index) => (
                <div key={link.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 space-y-2 sm:space-y-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate">{truncateUrl(link.destinationUrl, 60)}</p>
                    <p className="text-gray-400 text-sm">{link.clicks || 0} clicks • ${Number(link.revenue || 0).toFixed(2)} earned</p>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(link.shortLink || link.impactLink, 'Link')}
                    variant="ghost"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Copy
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Messages */}
        {success && (
          <Card variant="glass" className="border-green-500/50 bg-green-500/10">
            <div className="flex items-center space-x-3 text-green-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{success}</span>
            </div>
          </Card>
        )}
        
        {error && (
          <Card variant="glass" className="border-red-500/50 bg-red-500/10">
            <div className="flex items-center justify-between text-red-400">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>{error}</span>
              </div>
              {error.includes('Session expired') && (
                <Button 
                  onClick={() => navigate('/login')} 
                  variant="primary" 
                  size="sm"
                  className="ml-4"
                >
                  Login Again
                </Button>
              )}
            </div>
          </Card>
        )}
      </Container>
    </div>
  )
}
