import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch, API_BASE } from '../lib/api'
import { useNavigate } from 'react-router-dom'
// Import new Zylike-inspired UI components
import { Button, Card, Container, Input, Skeleton } from '../components/ui'

export default function LinkGenerator() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [copyClicked, setCopyClicked] = useState(false)
  const [productUrl, setProductUrl] = useState('')
  const [generatedLink, setGeneratedLink] = useState(null)
  const [urlValidation, setUrlValidation] = useState({ isValid: true, message: '' })
  const [dashboardData, setDashboardData] = useState({
    totalLinks: 0,
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
        let analyticsRes, linksRes
        
        try {
          console.log('🌐 Loading dashboard data via API calls to:', API_BASE)
          const [analyticsPromise, linksPromise] = [
            fetch(`${API_BASE}/api/creator/analytics`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE}/api/creator/links`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
          ]
          
          const [analyticsResponse, linksResponse] = await Promise.all([
            analyticsPromise, linksPromise
          ])
          
          analyticsRes = await analyticsResponse.json()
          linksRes = await linksResponse.json()
          
          console.log('✅ Direct API calls successful')
        } catch (directError) {
          console.log('⚠️ Direct API calls failed, using fallback...')
          
          // Fallback to apiFetch
          [analyticsRes, linksRes] = await Promise.all([
            apiFetch('/api/creator/analytics', { token }),
            apiFetch('/api/creator/links', { token })
          ])
        }
      
      setDashboardData({
        totalLinks: linksRes.links?.length || 0,
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
      
      // Use the configured API base URL
      console.log('🌐 Making API call to:', `${API_BASE}/api/creator/links`)
      
      const result = await apiFetch('/api/creator/links', {
        method: 'POST',
        body: { destinationUrl: productUrl },
        token
      })
      
      console.log('✅ API call successful:', result)
      
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
    console.log('🔍 Copy function called:', { text, linkType })
    
    // Set copy clicked state for immediate visual feedback
    setCopyClicked(true)
    
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          console.log('✅ Modern clipboard API success')
          setSuccess(`✅ ${linkType} copied successfully!`)
          setTimeout(() => {
            setSuccess('')
            setCopyClicked(false)
          }, 4000)
        })
        .catch((err) => {
          console.log('⚠️ Modern clipboard API failed, using fallback:', err)
          // Fallback to old method
          fallbackCopyTextToClipboard(text, linkType)
        })
    } else {
      console.log('⚠️ Modern clipboard not available, using fallback')
      // Fallback for older browsers
      fallbackCopyTextToClipboard(text, linkType)
    }
  }

  const fallbackCopyTextToClipboard = (text, linkType) => {
    console.log('🔄 Using fallback copy method')
    
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
      console.log('✅ Fallback copy success')
      setSuccess(`✅ ${linkType} copied successfully!`)
      setTimeout(() => {
        setSuccess('')
        setCopyClicked(false)
      }, 4000)
    } catch (err) {
      console.log('❌ Fallback copy failed:', err)
      setError('❌ Failed to copy to clipboard')
      setTimeout(() => {
        setError('')
        setCopyClicked(false)
      }, 4000)
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
      <div className="min-h-screen bg-gray-50">
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
    <div className="min-h-screen bg-gray-50">
      <Container className="py-4 sm:py-6 lg:py-8 animate-fadeIn">
        {/* Hero Section */}
        <div className="mb-6 sm:mb-8 animate-slideIn">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 text-center sm:text-left">
            Welcome back, <span className="text-blue-600">{user?.name || 'Creator'}!</span>
          </h1>
          <p className="text-gray-600 text-base sm:text-lg text-center sm:text-left">
            Transform your audience into revenue with powerful affiliate links
          </p>
          {/* Stats Cards - Simple Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto sm:mx-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.totalLinks}</p>
                  <p className="text-sm text-gray-600">Active Links</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Card className="bg-green-50 border border-green-200 mb-6 animate-fadeIn">
            <div className="flex items-center justify-center space-x-3 text-green-800 py-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-green-800">{success}</span>
            </div>
          </Card>
        )}
        

        
        {error && (
          <Card className="bg-red-50 border border-red-200 mb-6 animate-fadeIn">
            <div className="flex items-center justify-between text-red-800 py-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className="text-lg font-semibold">{error}</span>
              </div>
              {error.includes('Session expired') && (
                <Button 
                  onClick={() => navigate('/login')} 
                  variant="primary" 
                  size="sm"
                  className="ml-4 bg-red-600 hover:bg-red-700 text-white"
                >
                  Login Again
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Link Generation Form - Simple Style */}
        <Card className="bg-white border border-gray-200 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mb-6">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 text-2xl">🔗</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Affiliate Link Generator</h2>
              <p className="text-gray-600 text-sm sm:text-base">Create high-converting affiliate links in seconds</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-6">
              <Input
                type="url"
                value={productUrl}
                onChange={handleUrlChange}
                placeholder="https://walmart.com/product/example"
                label="Product URL"
                error={!urlValidation.isValid ? urlValidation.message : ''}
                className="flex-1 min-w-0 lg:mr-2"
                required
              />
              <Button 
                type="submit" 
                disabled={loading || !productUrl.trim()}
                loading={loading}
                size="md"
                className="w-full lg:w-auto lg:min-w-[80px] lg:flex-shrink-0 self-end bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
              >
                Generate Link
              </Button>
            </div>
            {urlValidation.message && urlValidation.isValid && (
              <div className="text-green-600 text-sm flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{urlValidation.message}</span>
              </div>
            )}
          </form>
        </Card>

        {/* Generated Link Display - Simple Style */}
        {generatedLink && (
          <Card className="bg-white border border-gray-200 shadow-sm mb-8 animate-scaleIn">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-2xl">🎉</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Link is Ready!</h3>
              <p className="text-gray-600">Share this link to start earning commissions</p>
            </div>

            {/* Primary Link Card */}
            <Card className="bg-gray-50 border border-gray-200 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">✨</span>
                    <span className="text-gray-700 font-semibold">Share This Link</span>
                  </div>
                  <p className="text-gray-900 text-lg font-mono break-all mb-2 p-3 bg-white rounded-lg border border-gray-300">
                    {generatedLink.shortLink}
                  </p>
                  <p className="text-gray-600 text-sm">Clean, branded link perfect for social media</p>
                </div>
                
                <button
                  onClick={() => copyToClipboard(generatedLink.shortLink, 'Short link')}
                  className={`w-full sm:w-auto font-semibold py-2 px-3 rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center ${
                    copyClicked 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copyClicked ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </Card>
          </Card>
        )}

        {/* Quick Actions - Simple Style */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-8">
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-bold text-gray-900">View Analytics</h3>
                <p className="text-gray-600 text-sm">Deep dive into performance</p>
              </div>
            </div>
            <Button 
              onClick={() => handleQuickAction('analytics')}
              variant="secondary"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
            >
              View Analytics
            </Button>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-bold text-gray-900">Referral Program</h3>
                <p className="text-gray-600 text-sm">Invite friends, earn 10%</p>
              </div>
            </div>
            <Button 
              onClick={() => handleQuickAction('referrals')}
              variant="secondary"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
            >
              Invite Friends
            </Button>
          </Card>
        </div>

        {/* Recent Links - if any */}
        {dashboardData.recentLinks.length > 0 && (
          <Card className="bg-white border border-gray-200 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Recent Links</h3>
              <Button
                onClick={() => handleQuickAction('manage-links')}
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700"
              >
                View All →
              </Button>
            </div>
            <div className="space-y-4">
              {dashboardData.recentLinks.map((link, index) => (
                <div key={link.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3 sm:space-y-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-900 font-medium truncate text-sm sm:text-base">{truncateUrl(link.shortLink || link.impactLink, 60)}</p>
                    <p className="text-gray-600 text-xs sm:text-sm">{link.clicks || 0} clicks • ${Number(link.revenue || 0).toFixed(2)} earned</p>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(link.shortLink || link.impactLink, 'Link')}
                    variant="ghost"
                    size="sm"
                    className="w-full sm:w-auto bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium py-2 px-4 rounded-lg transition-all duration-300"
                  >
                    Copy
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

      </Container>
    </div>
  )
}
