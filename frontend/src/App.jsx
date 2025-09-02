import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { useState } from 'react'

import Login from './pages/Login'
import LinkGenerator from './pages/LinkGenerator'
import MyLinks from './pages/MyLinks'
import CreatorAnalytics from './pages/CreatorAnalytics'
import Earnings from './pages/Earnings'
import PaymentSetup from './pages/PaymentSetup'
import Signup from './pages/Signup'
import Settings from './pages/Settings'
import Referrals from './pages/Referrals'
import Payouts from './pages/Payouts'
import ApplicationPending from './pages/ApplicationPending'
import CreatorApplication from './pages/CreatorApplication'
import AdminOverview from './pages/admin/AdminOverview'
import PendingApplications from './pages/admin/PendingApplications'
import CreatorManagement from './pages/admin/CreatorManagement'
import EmailCenter from './pages/admin/EmailCenter'
import PerformanceAnalytics from './pages/admin/PerformanceAnalytics'
import HistoricalAnalytics from './pages/admin/HistoricalAnalytics'
import SystemSettings from './pages/admin/SystemSettings'
import PayoutQueue from './pages/admin/PayoutQueue'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

function Placeholder({ title }) {
  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>{title}</h1>
      <p style={{ color: '#6b7280' }}>Page coming soon per ZYLIKE guide.</p>
    </div>
  )
}

function Nav() {
  const { user, token, setToken } = useAuth() || {}
  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  
  console.log('Nav component:', { user, isAdmin, role: user?.role }) // Debug log
  
  if (!token) return null // Don't show nav on login/signup pages

  const creatorNavItems = [
    { path: '/link-generator', label: 'Links', icon: '🔗' },
    { path: '/analytics', label: 'Analytics', icon: '📊' },
    { path: '/earnings', label: 'Earnings', icon: '💰' },
    { path: '/payment-setup', label: 'Payment', icon: '💳' },
    { path: '/referrals', label: 'Referrals', icon: '👥' }
  ]

  const adminNavItems = [
    { path: '/admin', label: 'Overview', icon: '🏠' },
    { path: '/admin/creators', label: 'Creators', icon: '👥' },
    { path: '/admin/email-management', label: 'Email Center', icon: '📧' },
    { path: '/admin/payout-queue', label: 'Payouts', icon: '💳' },
    { path: '/admin/pending-applications', label: 'Applications', icon: '📋' },
    { path: '/admin/performance-analytics', label: 'Analytics', icon: '📊' },
    { path: '/admin/historical-analytics', label: 'Historical Data', icon: '📈' }
  ]

  const navItems = isAdmin ? adminNavItems : creatorNavItems
  
  return (
    <nav className="bg-gradient-to-r from-purple-900/90 to-blue-900/90 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-accent-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Zylike</h1>
                {user && (
                  <p className="text-purple-200 text-sm">Welcome, {user.name} ✨</p>
                )}
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 text-purple-200 hover:text-white hover:bg-white/10 hover:scale-105"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="hidden lg:block">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Desktop Profile & Logout */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Profile Info */}
            <div className="flex items-center space-x-2 bg-white/10 rounded-xl px-3 py-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center text-sm font-bold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || '👤'}
              </div>
              <div className="hidden lg:block">
                <p className="text-white text-sm font-medium">{user?.name || 'Creator'}</p>
                <p className="text-purple-200 text-xs">{user?.email || 'email@example.com'}</p>
                <p className="text-blue-200 text-xs">{isAdmin ? 'Admin Account' : 'Creator Account'}</p>
              </div>
            </div>
            

            <button 
              onClick={() => setToken('')}
              className="flex items-center space-x-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden lg:block">Sign Out</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white p-2 rounded-xl hover:bg-white/10 transition-all duration-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 text-purple-200 hover:text-white hover:bg-white/10"
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            
            {/* Mobile Profile Section */}
            <div className="pt-4 border-t border-white/10">
              <div className="p-4 bg-white/5 rounded-xl mb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center text-lg font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || '👤'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-base">{user?.name || 'Creator Name'}</h4>
                    <p className="text-sm text-gray-300">{user?.email || 'email@example.com'}</p>
                    <p className="text-sm text-blue-300">{isAdmin ? 'Admin Account' : 'Creator Account'}</p>
                  </div>
                </div>
              </div>
              
              {/* Mobile Logout */}
              <button
                onClick={() => setToken('')}
                className="w-full flex items-center space-x-3 bg-red-500/20 text-red-400 px-4 py-3 rounded-xl font-medium transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

function RequireAuth({ children }){
  const { token, user, loading } = useAuth()
  
  if (!token) return <Navigate to="/login" replace />
  
  // Wait for user data to load
  if (loading || !user) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <div className="loading-spinner"></div>
      Loading...
    </div>
  }
  
  // Check if creator account is not activated (for regular users, not admins)
  if (user.role === 'USER' && user.applicationStatus === 'PENDING') {
    return <Navigate to="/application-pending" replace />
  }
  
  if (user.role === 'USER' && !user.isActive) {
    return <Navigate to="/application-pending" replace />
  }
  
  return children
}

function RequireAdmin({ children }) {
  const { token, user, loading } = useAuth()
  
  console.log('RequireAdmin - Full debug:', { token: !!token, user, loading, userRole: user?.role }) // Enhanced debug log
  
  if (!token) return <Navigate to="/login" replace />
  
  // Wait for user data to load
  if (loading || !user) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <div className="loading-spinner"></div>
      Loading...
    </div>
  }
  
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
  
  console.log('RequireAdmin - Final check:', { user, isAdmin, role: user.role, willRedirect: !isAdmin }) // Enhanced debug log
  
  if (!isAdmin) return <Navigate to="/link-generator" replace />
  return children
}

function RoleBasedRedirect() {
  const { user, loading } = useAuth()
  
  console.log('RoleBasedRedirect - Full debug:', { user, loading, userRole: user?.role, applicationStatus: user?.applicationStatus }) // Enhanced debug log
  
  // Wait for user data to load
  if (loading || !user) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <div className="loading-spinner"></div>
      Loading...
    </div>
  }
  
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
  
  // For regular users, check application status first
  if (!isAdmin) {
    // If user hasn't submitted application yet (status is null/undefined), send to application form
    if (!user.applicationStatus) {
      console.log('RoleBasedRedirect - No application status, redirecting to application form')
      return <Navigate to="/creator-application" replace />
    }
    
    // If application is pending or user is inactive, send to pending page
    if (user.applicationStatus === 'PENDING' || !user.isActive) {
      console.log('RoleBasedRedirect - Pending application, redirecting to pending page')
      return <Navigate to="/application-pending" replace />
    }
  }
  
  console.log('RoleBasedRedirect - Final check:', { user, isAdmin, role: user.role, willRedirectTo: isAdmin ? '/admin' : '/link-generator' }) // Enhanced debug log
  
  if (isAdmin) {
    return <Navigate to="/admin" replace />
  } else {
    return <Navigate to="/link-generator" replace />
  }
}

function Layout({ children }) {
  const { token } = useAuth()
  
  if (!token) {
    return (
      <div>
        {children}
        <SiteFooter />
      </div>
    ) // Public layout includes footer
  }
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
      padding: '2rem' 
    }}>
      <main style={{ maxWidth: '80rem', margin: '0 auto' }}>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

function SiteFooter() {
  return (
    <footer style={{ borderTop: '1px solid rgba(0,0,0,0.08)', padding: '1rem 0', marginTop: '2rem' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6b7280' }}>
        <span>© {new Date().getFullYear()} Zylike</span>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Nav />
        <Layout>
          <Routes>
            <Route path="/" element={<RequireAuth><RoleBasedRedirect /></RequireAuth>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/application-pending" element={<ApplicationPending />} />
            <Route path="/creator-application" element={<CreatorApplication />} />
            <Route path="/link-generator" element={<RequireAuth><LinkGenerator /></RequireAuth>} />
            <Route path="/my-links" element={<RequireAuth><MyLinks /></RequireAuth>} />
            <Route path="/analytics" element={<RequireAuth><CreatorAnalytics /></RequireAuth>} />
            <Route path="/earnings" element={<RequireAuth><Earnings /></RequireAuth>} />
            <Route path="/payment-setup" element={<RequireAuth><PaymentSetup /></RequireAuth>} />
            <Route path="/payouts" element={<RequireAuth><Payouts /></RequireAuth>} />
            <Route path="/referrals" element={<RequireAuth><Referrals /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />

            {/* Public legal pages */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            <Route path="/admin" element={<RequireAdmin><AdminOverview /></RequireAdmin>} />
            <Route path="/admin/pending-applications" element={<RequireAdmin><PendingApplications /></RequireAdmin>} />
            <Route path="/admin/creators" element={<RequireAdmin><CreatorManagement /></RequireAdmin>} />
            <Route path="/admin/email-management" element={<RequireAdmin><EmailCenter /></RequireAdmin>} />
            <Route path="/admin/payout-queue" element={<RequireAdmin><PayoutQueue /></RequireAdmin>} />
            <Route path="/admin/performance-analytics" element={<RequireAdmin><PerformanceAnalytics /></RequireAdmin>} />
            <Route path="/admin/historical-analytics" element={<RequireAdmin><HistoricalAnalytics /></RequireAdmin>} />
            <Route path="/admin/system-settings" element={<RequireAdmin><SystemSettings /></RequireAdmin>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  )
}
