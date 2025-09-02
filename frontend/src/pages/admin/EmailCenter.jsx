import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'

export default function EmailCenter() {
  const { user, token } = useAuth()
  const [creators, setCreators] = useState([])
  const [sending, setSending] = useState(false)
  const [sendResults, setSendResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emailMode, setEmailMode] = useState('maintenance')
  const [customSubject, setCustomSubject] = useState('')
  const [customContent, setCustomContent] = useState('')

  useEffect(() => {
    loadCreators()
  }, [])

  const loadCreators = async () => {
    try {
      console.log('Loading creators for email sending...')
      const response = await apiFetch('/api/admin/creators', { token })
      console.log('Creators loaded:', response.creators.length)
      
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
      console.error('Failed to load creators:', error)
      setCreators([])
      setLoading(false)
    }
  }

  const sendMaintenanceNotice = async () => {
    if (!confirm('Send maintenance notice to ' + creators.length + ' creators?')) {
      return
    }

    setSending(true)
    setSendResults(null)

    try {
      const emailData = {
        subject: 'Important Notice: Temporary Analytics Display Issues (Your Earnings Are Safe!)',
        htmlContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f4f4; padding: 20px;"><div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;"><h1 style="margin: 0; font-size: 24px;">Analytics Maintenance Notice</h1><p style="margin: 10px 0 0 0;">Important information about your dashboard</p></div><div style="padding: 30px;"><p>Dear {{CREATOR_NAME}},</p><p>We hope this message finds you well! We are writing to inform you about some temporary display issues you might notice in your analytics and earnings dashboard this week.</p><div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;"><h3 style="color: #555; margin-top: 0;">What You Might See</h3><ul style="padding-left: 20px;"><li><strong>Unusual numbers</strong> in your analytics dashboard</li><li><strong>Inconsistent data</strong> between different pages</li><li><strong>Missing or fluctuating sales figures</strong></li><li><strong>Temporary display errors</strong> in earnings calculations</li><li><strong>Loading delays</strong> on analytics pages</li></ul></div><div style="background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 5px;"><h3 style="color: #555; margin-top: 0;">Your Earnings Are 100% Safe</h3><p><strong>IMPORTANT</strong>: Please do not worry! These are purely <strong>display issues</strong> and do <strong>NOT</strong> affect your actual earnings:</p><ul style="padding-left: 20px;"><li>All your commissions are completely saved and reserved</li><li>Every sale you have generated is securely tracked</li><li>Your payment eligibility remains unchanged</li><li>No earnings data has been lost or modified</li><li>All pending payments are protected</li></ul></div><h3 style="color: #555;">What We are Doing</h3><p>Our technical team is working around the clock to:</p><ul style="padding-left: 20px;"><li><strong>Optimize data synchronization</strong> with our affiliate partners</li><li><strong>Improve analytics accuracy</strong> and real-time reporting</li><li><strong>Enhance security measures</strong> to protect your data</li><li><strong>Upgrade performance</strong> for faster dashboard loading</li><li><strong>Strengthen data validation</strong> systems</li></ul><h3 style="color: #555;">Expected Resolution</h3><p>We expect these display issues to be fully resolved by <strong>Friday, September 6th, 2025</strong>. During this time:</p><ul style="padding-left: 20px;"><li><strong>Continue promoting your links</strong> - all tracking is working normally</li><li><strong>Your commissions are being recorded</strong> accurately behind the scenes</li><li><strong>Payment processing</strong> continues as usual</li><li><strong>Support is available</strong> if you have any concerns</li></ul><h3 style="color: #555;">Need Help?</h3><p>If you have any questions or concerns about your earnings, please do not hesitate to reach out:</p><ul style="padding-left: 20px;"><li><strong>Email</strong>: support@zylike.com</li><li><strong>Dashboard</strong>: Use the Contact Support feature</li><li><strong>Response Time</strong>: Within 24 hours</li></ul><div style="text-align: center; margin: 30px 0;"><a href="mailto:support@zylike.com" style="display: inline-block; background: #667eea; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Contact Support</a></div><h3 style="color: #555;">Thank You for Your Patience</h3><p>We sincerely apologize for any confusion these temporary display issues may cause. Your trust is important to us, and we are committed to providing you with the most accurate and reliable analytics platform possible.</p><p>Thank you for being a valued member of the Zylike creator community!</p><p><strong>Best regards,</strong><br>The Zylike Team</p><div style="background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 5px;"><h4 style="margin-top: 0;">Quick Reminder</h4><p style="margin-bottom: 0;">Keep sharing your affiliate links - everything is working perfectly behind the scenes, and your earnings continue to grow!</p></div></div><div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding: 20px; background: #f9f9f9;"><p style="margin: 0;">This is an automated message. Please do not reply to this email.<br>For support, use the contact methods listed above.</p><p style="margin: 5px 0 0 0;">© 2025 Zylike. All rights reserved.</p></div></div></div>',
        sendToAll: true
      }

      console.log('Sending maintenance notice to ' + creators.length + ' creators...')

      const response = await apiFetch('/api/admin/send-email', {
        method: 'POST',
        token,
        body: emailData
      })

      setSendResults(response)
      
      if (response.success) {
        alert('Maintenance notice sent successfully!')
      } else {
        alert('Failed to send emails: ' + response.message)
      }
    } catch (error) {
      console.error('Failed to send maintenance notice:', error)
      alert('Failed to send maintenance notice: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const sendCustomEmail = async () => {
    if (!customSubject.trim() || !customContent.trim()) {
      alert('Please fill in both subject and content')
      return
    }

    if (!confirm('Send custom email "' + customSubject + '" to ' + creators.length + ' creators?')) {
      return
    }

    setSending(true)
    setSendResults(null)

    try {
      // Build safe HTML content
      const htmlParts = [
        '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f4f4; padding: 20px;">',
        '<div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">',
        '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">',
        '<h1 style="margin: 0; font-size: 24px;">Message from Zylike</h1>',
        '</div>',
        '<div style="padding: 30px;">',
        '<p>Dear {{CREATOR_NAME}},</p>',
        '<div style="white-space: pre-line; line-height: 1.6;">' + customContent + '</div>',
        '<p style="margin-top: 30px;"><strong>Best regards,</strong><br>The Zylike Team</p>',
        '</div>',
        '<div style="text-align: center; color: #666; font-size: 12px; padding: 20px; background: #f9f9f9;">',
        '<p style="margin: 0;">© 2025 Zylike. All rights reserved.</p>',
        '</div>',
        '</div>',
        '</div>'
      ]

      const emailData = {
        subject: customSubject,
        htmlContent: htmlParts.join(''),
        sendToAll: true
      }

      console.log('Sending custom email to ' + creators.length + ' creators...')

      const response = await apiFetch('/api/admin/send-email', {
        method: 'POST',
        token,
        body: emailData
      })

      setSendResults(response)
      
      if (response.success) {
        alert('Custom email sent successfully!')
        setCustomSubject('')
        setCustomContent('')
      } else {
        alert('Failed to send emails: ' + response.message)
      }
    } catch (error) {
      console.error('Failed to send custom email:', error)
      alert('Failed to send custom email: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const loadTemplate = (type) => {
    switch(type) {
      case 'feature':
        setCustomSubject('New Feature Announcement')
        setCustomContent('We are excited to announce a new feature that will help you earn more commissions!\n\n[Describe the new feature here]\n\nStart using it today in your dashboard.\n\nHappy earning!')
        break
      case 'commission':
        setCustomSubject('Commission Rate Update')
        setCustomContent('Great news! We are updating commission rates to help you earn more.\n\n[Details about the rate change]\n\nThis change will take effect [date].\n\nKeep up the great work!')
        break
      case 'performance':
        setCustomSubject('Monthly Performance Report')
        setCustomContent('Here is your monthly performance summary:\n\n• Total clicks: [number]\n• Total sales: [number]\n• Total earnings: $[amount]\n\nGreat job this month! Keep promoting your links.')
        break
      case 'tips':
        setCustomSubject('Marketing Tips & Best Practices')
        setCustomContent('Here are some proven strategies to boost your affiliate earnings:\n\n1. [Marketing tip 1]\n2. [Marketing tip 2]\n3. [Marketing tip 3]\n\nImplement these tips to see better results!')
        break
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Center</h1>
          <p className="text-gray-600">Send emails and announcements to all active creators</p>
        </div>

        {/* Mode Selector */}
        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setEmailMode('maintenance')}
              className={'px-6 py-3 rounded-lg font-medium transition-colors ' + (
                emailMode === 'maintenance'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              Maintenance Notice
            </button>
            <button
              onClick={() => setEmailMode('custom')}
              className={'px-6 py-3 rounded-lg font-medium transition-colors ' + (
                emailMode === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              Custom Email
            </button>
          </div>
        </div>

        {/* Send Results */}
        {sendResults && (
          <div className={'mb-6 p-4 rounded-lg ' + (sendResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200')}>
            <h3 className={'font-semibold ' + (sendResults.success ? 'text-green-800' : 'text-red-800')}>
              {sendResults.success ? 'Email Sent Successfully!' : 'Email Send Failed'}
            </h3>
            <p className={'text-sm ' + (sendResults.success ? 'text-green-700' : 'text-red-700')}>
              {sendResults.message}
            </p>
          </div>
        )}

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

        {/* Maintenance Notice Mode */}
        {emailMode === 'maintenance' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Maintenance Notice</h2>
              <p className="text-gray-600 mt-1">Professional message to reassure creators about analytics issues</p>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Email Preview</h3>
                <div className="text-sm text-gray-700 space-y-2">
                  <p><strong>Subject:</strong> Important Notice: Temporary Analytics Display Issues (Your Earnings Are Safe!)</p>
                  <p><strong>Message:</strong> Professional maintenance notice explaining analytics issues and reassuring creators their earnings are 100% safe</p>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={sendMaintenanceNotice}
                  disabled={sending || creators.length === 0}
                  className="bg-orange-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending...' : 'Send Maintenance Notice to ' + creators.length + ' Creators'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Email Mode */}
        {emailMode === 'custom' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Custom Email</h2>
              <p className="text-gray-600 mt-1">Compose and send custom messages to all creators</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Quick Templates */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Quick Templates</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => loadTemplate('feature')}
                    className="text-left p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="font-medium text-blue-900 text-sm">Feature Announcement</div>
                  </button>
                  <button
                    onClick={() => loadTemplate('commission')}
                    className="text-left p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <div className="font-medium text-green-900 text-sm">Commission Update</div>
                  </button>
                  <button
                    onClick={() => loadTemplate('performance')}
                    className="text-left p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <div className="font-medium text-purple-900 text-sm">Performance Report</div>
                  </button>
                  <button
                    onClick={() => loadTemplate('tips')}
                    className="text-left p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                  >
                    <div className="font-medium text-yellow-900 text-sm">Marketing Tips</div>
                  </button>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Content</label>
                <textarea
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  placeholder="Enter your message... Creator names will be personalized automatically"
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Creator names will be personalized automatically. Line breaks will be preserved.
                </p>
              </div>

              {/* Preview */}
              {customContent && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
                  <div className="text-sm text-gray-600">
                    <p><strong>To:</strong> All {creators.length} active creators</p>
                    <p><strong>Subject:</strong> {customSubject || '[No subject]'}</p>
                    <div className="mt-2 p-3 bg-white rounded border">
                      <p className="text-xs text-gray-500">Dear [Creator Name],</p>
                      <div className="whitespace-pre-line text-xs mt-2">
                        {customContent.substring(0, 200)}
                        {customContent.length > 200 && '...'}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Best regards,<br/>The Zylike Team</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Send Button */}
              <div className="text-center">
                <button
                  onClick={sendCustomEmail}
                  disabled={sending || creators.length === 0 || !customSubject.trim() || !customContent.trim()}
                  className="bg-blue-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending...' : 'Send Custom Email to ' + creators.length + ' Creators'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
