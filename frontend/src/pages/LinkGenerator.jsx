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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      <Container className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-12 animate-fadeIn">

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

        {/* Link Generation Form - Enhanced Mobile Responsive Style */}
        <Card className="bg-white/90 backdrop-blur-sm border border-white/20 shadow-2xl mb-8 sm:mb-12 max-w-4xl mx-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-xl">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">Affiliate Link Generator</h2>
              <p className="text-gray-600 text-base sm:text-lg px-4">Create high-converting affiliate links in seconds</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-3 sm:space-y-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2 px-2">Product URL</label>
                <div className="relative">
                  <Input
                    type="url"
                    value={productUrl}
                    onChange={handleUrlChange}
                    placeholder="https://walmart.com/product/example"
                    error={!urlValidation.isValid ? urlValidation.message : ''}
                    className="w-full text-base sm:text-lg py-3 sm:py-4 pl-4 sm:pl-6 pr-12 sm:pr-14 border-2 border-blue-300 bg-blue-50/30 rounded-lg sm:rounded-xl focus:border-blue-500 focus:ring-2 sm:focus:ring-4 focus:ring-blue-200 focus:bg-white transition-all duration-300 placeholder-gray-500"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <Button 
                type="submit" 
                disabled={loading || !productUrl.trim()}
                loading={loading}
                size="lg"
                className={`w-full font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg sm:rounded-xl shadow-xl sm:shadow-2xl hover:shadow-2xl sm:hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300 text-base sm:text-lg ring-2 ${
                  !productUrl.trim() 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white ring-blue-300 hover:from-blue-600 hover:to-purple-700 hover:ring-blue-400' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-700 text-white ring-blue-300 hover:from-blue-700 hover:to-purple-800 hover:ring-blue-400'
                }`}
              >
                {loading ? 'Generating...' : 'Generate Link'}
              </Button>
              
              {urlValidation.message && urlValidation.isValid && (
                <div className="flex items-center justify-center space-x-2 text-green-600 text-sm font-medium px-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{urlValidation.message}</span>
                </div>
              )}
            </form>
          </div>
        </Card>

        {/* Generated Link Display - Enhanced Mobile Responsive Style */}
        {generatedLink && (
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 shadow-2xl mb-6 sm:mb-8 lg:mb-12 max-w-4xl mx-auto animate-scaleIn">
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="text-center mb-4 sm:mb-6 lg:mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 lg:mb-6 shadow-xl">
                  <span className="text-white text-2xl sm:text-3xl lg:text-4xl">🎉</span>
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4 px-2">Your Link is Ready!</h3>
                <p className="text-gray-600 text-sm sm:text-base lg:text-lg px-3 sm:px-4">Share this link to start earning commissions</p>
              </div>

              {/* Primary Link Card */}
              <Card className="bg-white/90 backdrop-blur-sm border border-white/20 shadow-xl">
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center">
                      <span className="text-white text-sm sm:text-base lg:text-xl">✨</span>
                    </div>
                    <span className="text-gray-800 font-bold text-sm sm:text-base lg:text-lg">Share This Link</span>
                  </div>
                  
                  <div className="bg-gray-50 rounded-md sm:rounded-lg lg:rounded-xl p-2 sm:p-3 lg:p-4 mb-3 sm:mb-4 border-2 border-gray-100">
                    <p className="text-gray-900 text-xs sm:text-sm lg:text-base font-mono break-all text-center leading-relaxed">
                      {generatedLink.shortLink}
                    </p>
                  </div>
                  
                  <p className="text-gray-600 text-center mb-3 sm:mb-4 lg:mb-6 text-xs sm:text-sm lg:text-base px-2">Clean, branded link perfect for social media</p>
                  
                  <button
                    onClick={() => copyToClipboard(generatedLink.shortLink, 'Short link')}
                    className={`w-full font-bold py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 rounded-md sm:rounded-lg lg:rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center text-sm sm:text-base lg:text-lg ${
                      copyClicked 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700' 
                        : 'bg-gradient-to-r from-blue-700 to-purple-700 text-white hover:from-blue-800 hover:to-purple-800'
                    } transform hover:-translate-y-1 hover:shadow-xl`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-1.5 sm:mr-2 lg:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {copyClicked ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </Card>
            </div>
          </Card>
        )}

        {/* Quick Actions - Enhanced Mobile Responsive Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12 max-w-6xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 group">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">View Analytics</h3>
                  <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Deep dive into performance</p>
                </div>
                <Button 
                  onClick={() => handleQuickAction('analytics')}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-sm sm:text-base lg:text-lg"
                >
                  View Analytics
                </Button>
              </div>
            </div>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 group">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Referral Program</h3>
                  <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Invite friends, earn 10%</p>
                </div>
                <Button 
                  onClick={() => handleQuickAction('referrals')}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-sm sm:text-base lg:text-lg"
                >
                  Invite Friends
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Links - Enhanced Mobile Responsive Style */}
        {dashboardData.recentLinks.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm border border-white/20 shadow-2xl mb-8 sm:mb-12 max-w-6xl mx-auto">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Recent Links</h3>
                </div>
                <Button
                  onClick={() => handleQuickAction('manage-links')}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-sm sm:text-base"
                >
                  View All →
                </Button>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                {dashboardData.recentLinks.map((link, index) => (
                  <div key={link.id} className="bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs sm:text-sm font-bold">{index + 1}</span>
                          </div>
                          <p className="text-gray-900 font-semibold truncate text-sm sm:text-base lg:text-lg">{truncateUrl(link.shortLink || link.impactLink, 50)}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                          <span className="flex items-center space-x-1">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>{link.clicks || 0} clicks</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            <span>${Number(link.revenue || 0).toFixed(2)} earned</span>
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => copyToClipboard(link.shortLink || link.impactLink, 'Link')}
                        className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-sm sm:text-base"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

      </Container>
    </div>
  )
}
