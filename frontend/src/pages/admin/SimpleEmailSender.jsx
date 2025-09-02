import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'

export default function SimpleEmailSender() {
  const { user, token } = useAuth()
  const [creators, setCreators] = useState([])
  const [sending, setSending] = useState(false)
  const [sendResults, setSendResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emailMode, setEmailMode] = useState('maintenance') // 'maintenance' or 'custom'
  const [customEmail, setCustomEmail] = useState({
    subject: '',
    content: '',
    useHtml: false
  })

  useEffect(() => {
    loadCreators()
  }, [])

  const loadCreators = async () => {
    try {
      console.log('🔄 Loading creators for email sending...')
      const response = await apiFetch('/api/admin/creators', { token })
      console.log('✅ Creators loaded:', response.creators.length)
      
      // Filter for active creators with valid emails
      const validCreators = response.creators.filter(creator => 
        creator.email && 
        creator.email.includes('@') && 
        creator.isActive && 
        creator.applicationStatus === 'APPROVED'
      )
      
      setCreators(validCreators)
      setLoading(false)
    } catch (error) {
      console.error('❌ Failed to load creators:', error)
      setCreators([])
      setLoading(false)
    }
  }

  const sendCustomEmail = async () => {
    if (!customEmail.subject.trim() || !customEmail.content.trim()) {
      alert('Please fill in both subject and content')
      return
    }

    if (!confirm(`Send custom email "${customEmail.subject}" to ${creators.length} creators?`)) {
      return
    }

    setSending(true)
    setSendResults(null)

    try {
      const emailData = {
        subject: customEmail.subject,
        htmlContent: customEmail.useHtml ? customEmail.content : 
          '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f4f4; padding: 20px;">' +
            '<div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">' +
              '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">' +
                '<h1 style="margin: 0; font-size: 24px;">📢 Message from Zylike</h1>' +
              '</div>' +
              '<div style="padding: 30px;">' +
                '<p>Dear {{CREATOR_NAME}},</p>' +
                '<div style="white-space: pre-line; line-height: 1.6;">' + customEmail.content + '</div>' +
                '<p style="margin-top: 30px;"><strong>Best regards,</strong><br>The Zylike Team</p>' +
              '</div>' +
              '<div style="text-align: center; color: #666; font-size: 12px; padding: 20px; background: #f9f9f9;">' +
                '<p style="margin: 0;">© 2025 Zylike. All rights reserved.</p>' +
              '</div>' +
            '</div>' +
          '</div>',
        sendToAll: true
      }

      console.log(`📧 Sending custom email to ${creators.length} creators...`)

      const response = await apiFetch('/api/admin/send-email', {
        method: 'POST',
        token,
        body: emailData
      })

      setSendResults(response)
      
      if (response.success) {
        alert(`✅ Custom email "${customEmail.subject}" sent successfully!`)
        // Reset form
        setCustomEmail({ subject: '', content: '', useHtml: false })
      } else {
        alert(`❌ Failed to send emails: ${response.message}`)
      }
    } catch (error) {
      console.error('❌ Failed to send custom email:', error)
      alert(`❌ Failed to send custom email: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  const sendMaintenanceNotice = async () => {
    if (!confirm(`Send maintenance notice to ${creators.length} creators?`)) {
      return
    }

    setSending(true)
    setSendResults(null)

    try {
      const maintenanceEmail = {
        subject: '🔧 Important Notice: Temporary Analytics Display Issues (Your Earnings Are Safe!)',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f4f4; padding: 20px;">
            <div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">🔧 Analytics Maintenance Notice</h1>
                <p style="margin: 10px 0 0 0;">Important information about your dashboard</p>
              </div>
              
              <div style="padding: 30px;">
                <p>Dear {{CREATOR_NAME}},</p>
                
                <p>We hope this message finds you well! We're writing to inform you about some temporary display issues you might notice in your analytics and earnings dashboard this week.</p>
                
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="color: #555; margin-top: 0;">🔍 What You Might See</h3>
                  <ul style="padding-left: 20px;">
                    <li><strong>Unusual numbers</strong> in your analytics dashboard</li>
                    <li><strong>Inconsistent data</strong> between different pages</li>
                    <li><strong>Missing or fluctuating sales figures</strong></li>
                    <li><strong>Temporary display errors</strong> in earnings calculations</li>
                    <li><strong>Loading delays</strong> on analytics pages</li>
                  </ul>
                </div>
                
                <div style="background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="color: #555; margin-top: 0;">💰 Your Earnings Are 100% Safe</h3>
                  <p><strong>IMPORTANT</strong>: Please don't worry! These are purely <strong>display issues</strong> and do <strong>NOT</strong> affect your actual earnings:</p>
                  <ul style="padding-left: 20px;">
                    <li>✅ <strong>All your commissions are completely saved and reserved</strong></li>
                    <li>✅ <strong>Every sale you've generated is securely tracked</strong></li>
                    <li>✅ <strong>Your payment eligibility remains unchanged</strong></li>
                    <li>✅ <strong>No earnings data has been lost or modified</strong></li>
                    <li>✅ <strong>All pending payments are protected</strong></li>
                  </ul>
                </div>
                
                <h3 style="color: #555;">🛠️ What We're Doing</h3>
                <p>Our technical team is working around the clock to:</p>
                <ul style="padding-left: 20px;">
                  <li><strong>Optimize data synchronization</strong> with our affiliate partners</li>
                  <li><strong>Improve analytics accuracy</strong> and real-time reporting</li>
                  <li><strong>Enhance security measures</strong> to protect your data</li>
                  <li><strong>Upgrade performance</strong> for faster dashboard loading</li>
                  <li><strong>Strengthen data validation</strong> systems</li>
                </ul>
                
                <h3 style="color: #555;">⏰ Expected Resolution</h3>
                <p>We expect these display issues to be fully resolved by <strong>Friday, September 6th, 2025</strong>. During this time:</p>
                <ul style="padding-left: 20px;">
                  <li><strong>Continue promoting your links</strong> - all tracking is working normally</li>
                  <li><strong>Your commissions are being recorded</strong> accurately behind the scenes</li>
                  <li><strong>Payment processing</strong> continues as usual</li>
                  <li><strong>Support is available</strong> if you have any concerns</li>
                </ul>
                
                <h3 style="color: #555;">📞 Need Help?</h3>
                <p>If you have any questions or concerns about your earnings, please don't hesitate to reach out:</p>
                <ul style="padding-left: 20px;">
                  <li><strong>Email</strong>: support@zylike.com</li>
                  <li><strong>Dashboard</strong>: Use the "Contact Support" feature</li>
                  <li><strong>Response Time</strong>: Within 24 hours</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="mailto:support@zylike.com" style="display: inline-block; background: #667eea; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Contact Support</a>
                </div>
                
                <h3 style="color: #555;">🙏 Thank You for Your Patience</h3>
                <p>We sincerely apologize for any confusion these temporary display issues may cause. Your trust is important to us, and we're committed to providing you with the most accurate and reliable analytics platform possible.</p>
                
                <p>Thank you for being a valued member of the Zylike creator community!</p>
                
                <p><strong>Best regards,</strong><br>
                The Zylike Team</p>
                
                <div style="background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h4 style="margin-top: 0;">📱 Quick Reminder</h4>
                  <p style="margin-bottom: 0;">Keep sharing your affiliate links - everything is working perfectly behind the scenes, and your earnings continue to grow!</p>
                </div>
              </div>
              
              <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding: 20px; background: #f9f9f9;">
                <p style="margin: 0;">This is an automated message. Please do not reply to this email.<br>
                For support, use the contact methods listed above.</p>
                <p style="margin: 5px 0 0 0;">© 2025 Zylike. All rights reserved.</p>
              </div>
            </div>
          </div>
        `,
        sendToAll: true
      }

      console.log(`📧 Sending maintenance notice to ${creators.length} creators...`)

      const response = await apiFetch('/api/admin/send-email', {
        method: 'POST',
        token,
        body: maintenanceEmail
      })

      setSendResults(response)
      
      if (response.success) {
        alert(`✅ Maintenance notice sent successfully to ${response.totalSent} creators!`)
      } else {
        alert(`❌ Failed to send emails: ${response.message}`)
      }
    } catch (error) {
      console.error('❌ Failed to send maintenance notice:', error)
      alert(`❌ Failed to send maintenance notice: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📧 Email Center
          </h1>
          <p className="text-gray-600">
            Send emails and announcements to all active creators
          </p>
        </div>

        {/* Email Mode Selector */}
        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setEmailMode('maintenance')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                emailMode === 'maintenance'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🔧 Maintenance Notice
            </button>
            <button
              onClick={() => setEmailMode('custom')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                emailMode === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📝 Custom Email
            </button>
          </div>
        </div>

        {/* Send Results */}
        {sendResults && (
          <div className={`mb-6 p-4 rounded-lg ${sendResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className={`font-semibold ${sendResults.success ? 'text-green-800' : 'text-red-800'}`}>
              {sendResults.success ? '✅ Maintenance Notice Sent Successfully!' : '❌ Email Send Failed'}
            </h3>
            <p className={`text-sm ${sendResults.success ? 'text-green-700' : 'text-red-700'}`}>
              {sendResults.message}
            </p>
            {sendResults.results && (
              <div className="mt-2 text-sm text-gray-600">
                <p>✅ Successful: {sendResults.results.successful}</p>
                <p>❌ Failed: {sendResults.results.failed}</p>
              </div>
            )}
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {emailMode === 'maintenance' ? '🔧 Maintenance Notice' : '📝 Custom Email'}
            </h2>
            <p className="text-gray-600 mt-1">
              {emailMode === 'maintenance' 
                ? 'Professional message to reassure creators about analytics issues'
                : 'Compose and send custom messages to all creators'
              }
            </p>
          </div>
          
          <div className="p-6">
            {/* Creator Count */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-600">Ready to Send</p>
                  <p className="text-2xl font-semibold text-blue-900">{creators.length} Active Creators</p>
                  <p className="text-sm text-blue-700">All approved creators with valid email addresses</p>
                </div>
              </div>
            </div>

            {/* Custom Email Composer */}
            {emailMode === 'custom' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">✍️ Compose Your Email</h3>
                
                {/* Subject */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Subject *
                  </label>
                  <input
                    type="text"
                    value={customEmail.subject}
                    onChange={(e) => setCustomEmail({ ...customEmail, subject: e.target.value })}
                    placeholder="Enter email subject..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Content */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Content *
                  </label>
                  <textarea
                    value={customEmail.content}
                    onChange={(e) => setCustomEmail({ ...customEmail, content: e.target.value })}
                    placeholder="Enter your message... Use {{CREATOR_NAME}} to personalize with creator names"
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use {{CREATOR_NAME}} to personalize emails. Line breaks will be preserved.
                  </p>
                </div>

                {/* HTML Mode Toggle */}
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={customEmail.useHtml}
                      onChange={(e) => setCustomEmail({ ...customEmail, useHtml: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Advanced: Use raw HTML (for developers)
                    </span>
                  </label>
                </div>

                {/* Preview */}
                {customEmail.content && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <p><strong>To:</strong> All {creators.length} active creators</p>
                      <p><strong>Subject:</strong> {customEmail.subject || '[No subject]'}</p>
                      <div className="mt-2 p-2 bg-white rounded border">
                        <p className="text-xs text-gray-500">Dear [Creator Name],</p>
                        <div className="whitespace-pre-line text-xs">
                          {customEmail.content.substring(0, 200)}
                          {customEmail.content.length > 200 && '...'}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Best regards,<br/>The Zylike Team</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Maintenance Notice Preview */}
            {emailMode === 'maintenance' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">📧 Maintenance Notice Preview</h3>
                <div className="text-sm text-gray-700 space-y-2">
                  <p><strong>Subject:</strong> 🔧 Important Notice: Temporary Analytics Display Issues (Your Earnings Are Safe!)</p>
                  <p><strong>Message:</strong> Professional maintenance notice explaining analytics issues and reassuring creators their earnings are 100% safe</p>
                  <p><strong>Features:</strong></p>
                  <ul className="list-disc list-inside text-xs text-gray-600 ml-4">
                    <li>Explains what creators might see (unusual numbers, inconsistencies)</li>
                    <li>Strong reassurance that earnings are completely protected</li>
                    <li>Clear timeline for resolution (Friday, September 6th)</li>
                    <li>Support contact information</li>
                    <li>Professional HTML styling with Zylike branding</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Send Button */}
            <div className="text-center">
              {emailMode === 'maintenance' ? (
                <button
                  onClick={sendMaintenanceNotice}
                  disabled={sending || creators.length === 0}
                  className="bg-orange-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                >
                  {sending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending Maintenance Notice...
                    </>
                  ) : (
                    `🔧 Send Maintenance Notice to ${creators.length} Creators`
                  )}
                </button>
              ) : (
                <button
                  onClick={sendCustomEmail}
                  disabled={sending || creators.length === 0 || !customEmail.subject.trim() || !customEmail.content.trim()}
                  className="bg-blue-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                >
                  {sending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending Custom Email...
                    </>
                  ) : (
                    `📧 Send Custom Email to ${creators.length} Creators`
                  )}
                </button>
              )}
              
              {creators.length === 0 && (
                <p className="text-red-600 text-sm mt-2">
                  No active creators found. Please check creator status.
                </p>
              )}

              {emailMode === 'custom' && (!customEmail.subject.trim() || !customEmail.content.trim()) && (
                <p className="text-amber-600 text-sm mt-2">
                  Please fill in both subject and content to send custom email.
                </p>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                📋 {emailMode === 'maintenance' ? 'Maintenance Notice' : 'Custom Email'} Features
              </h3>
              <div className="text-sm text-gray-700 space-y-1">
                {emailMode === 'maintenance' ? (
                  <>
                    <p>• <strong>Sends professional email</strong> to all active, approved creators</p>
                    <p>• <strong>Explains analytics maintenance</strong> and what they might see</p>
                    <p>• <strong>Reassures creators</strong> their earnings are 100% safe and protected</p>
                    <p>• <strong>Provides support contact</strong> information for questions</p>
                    <p>• <strong>Uses professional styling</strong> with Zylike branding</p>
                  </>
                ) : (
                  <>
                    <p>• <strong>Send any custom message</strong> to all active, approved creators</p>
                    <p>• <strong>Personalize with creator names</strong> using {{CREATOR_NAME}}</p>
                    <p>• <strong>Choose plain text or HTML</strong> formatting</p>
                    <p>• <strong>Professional email template</strong> wraps your content</p>
                    <p>• <strong>Live preview</strong> shows how email will look</p>
                  </>
                )}
                <p>• <strong>Uses your existing Mailgun</strong> integration for delivery</p>
                <p>• <strong>Background processing</strong> for large batches (no timeouts)</p>
                <p>• <strong>Rate limited</strong> to 1 email per second (respects Mailgun limits)</p>
              </div>
            </div>

            {/* Quick Templates for Custom Mode */}
            {emailMode === 'custom' && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">📝 Quick Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => setCustomEmail({
                      ...customEmail,
                      subject: '🎉 New Feature Announcement',
                      content: 'We are excited to announce a new feature that will help you earn more commissions!\n\n[Describe the new feature here]\n\nStart using it today in your dashboard.\n\nHappy earning!'
                    })}
                    className="text-left p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-blue-900">🎉 Feature Announcement</div>
                    <div className="text-xs text-blue-700">Announce new platform features</div>
                  </button>
                  
                  <button
                    onClick={() => setCustomEmail({
                      ...customEmail,
                      subject: '💰 Commission Rate Update',
                      content: 'Great news! We are updating commission rates to help you earn more.\n\n[Details about the rate change]\n\nThis change will take effect [date].\n\nKeep up the great work!'
                    })}
                    className="text-left p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-blue-900">💰 Commission Update</div>
                    <div className="text-xs text-blue-700">Notify about rate changes</div>
                  </button>
                  
                  <button
                    onClick={() => setCustomEmail({
                      ...customEmail,
                      subject: '📊 Monthly Performance Report',
                      content: 'Here is your monthly performance summary:\n\n• Total clicks: [number]\n• Total sales: [number]\n• Total earnings: $[amount]\n\nGreat job this month! Keep promoting your links.'
                    })}
                    className="text-left p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-blue-900">📊 Performance Report</div>
                    <div className="text-xs text-blue-700">Monthly stats and updates</div>
                  </button>
                  
                  <button
                    onClick={() => setCustomEmail({
                      ...customEmail,
                      subject: '🎯 Marketing Tips & Best Practices',
                      content: 'Here are some proven strategies to boost your affiliate earnings:\n\n1. [Marketing tip 1]\n2. [Marketing tip 2]\n3. [Marketing tip 3]\n\nImplement these tips to see better results!'
                    })}
                    className="text-left p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-blue-900">🎯 Marketing Tips</div>
                    <div className="text-xs text-blue-700">Share best practices</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
