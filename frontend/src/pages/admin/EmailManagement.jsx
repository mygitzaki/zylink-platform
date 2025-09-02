import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'

export default function EmailManagement() {
  const { user, token } = useAuth()
  const [templates, setTemplates] = useState([])
  const [creators, setCreators] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [emailForm, setEmailForm] = useState({
    subject: '',
    htmlContent: '',
    textContent: '',
    sendToAll: false,
    selectedCreators: []
  })
  const [sending, setSending] = useState(false)
  const [sendResults, setSendResults] = useState(null)
  const [creatorFilter, setCreatorFilter] = useState({
    status: 'APPROVED',
    isActive: 'true'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplates()
    loadCreators()
  }, [])

  useEffect(() => {
    loadCreators()
  }, [creatorFilter])

  const loadTemplates = async () => {
    try {
      console.log('🔄 Loading email templates...')
      const response = await apiFetch('/api/admin/email-templates', { token })
      console.log('✅ Email templates loaded:', response)
      setTemplates(response.templates || [])
    } catch (error) {
      console.error('❌ Failed to load email templates:', error)
      // Set fallback templates if API fails
      setTemplates([
        {
          id: 'maintenance_notice',
          name: 'Maintenance Notice (Fallback)',
          subject: '🔧 Important Notice: Temporary Analytics Display Issues (Your Earnings Are Safe!)',
          description: 'Notify creators about temporary analytics issues during maintenance',
          htmlContent: `<p>Dear {{CREATOR_NAME}},</p><p>We're experiencing temporary analytics display issues. Your earnings are 100% safe!</p><p>Best regards,<br>The Zylike Team</p>`
        }
      ])
    }
  }

  const loadCreators = async () => {
    try {
      console.log('🔄 Loading creators...')
      const params = new URLSearchParams()
      if (creatorFilter.status) params.append('status', creatorFilter.status)
      if (creatorFilter.isActive) params.append('isActive', creatorFilter.isActive)
      
      const response = await apiFetch(`/api/admin/creator-emails?${params}`, { token })
      console.log('✅ Creators loaded:', response)
      setCreators(response.creators || [])
      setLoading(false)
    } catch (error) {
      console.error('❌ Failed to load creators:', error)
      // Fallback: try to load from existing creators endpoint
      try {
        console.log('🔄 Trying fallback creators endpoint...')
        const fallbackResponse = await apiFetch('/api/admin/creators', { token })
        console.log('✅ Fallback creators loaded:', fallbackResponse)
        setCreators(fallbackResponse.creators || [])
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError)
        setCreators([])
      }
      setLoading(false)
    }
  }

  const selectTemplate = (template) => {
    setSelectedTemplate(template)
    setEmailForm({
      ...emailForm,
      subject: template.subject,
      htmlContent: template.htmlContent
    })
  }

  const handleCreatorSelection = (creatorId, selected) => {
    if (selected) {
      setEmailForm({
        ...emailForm,
        selectedCreators: [...emailForm.selectedCreators, creatorId]
      })
    } else {
      setEmailForm({
        ...emailForm,
        selectedCreators: emailForm.selectedCreators.filter(id => id !== creatorId)
      })
    }
  }

  const selectAllCreators = () => {
    setEmailForm({
      ...emailForm,
      selectedCreators: creators.map(c => c.id)
    })
  }

  const clearSelection = () => {
    setEmailForm({
      ...emailForm,
      selectedCreators: []
    })
  }

  const sendEmail = async () => {
    if (!emailForm.subject || !emailForm.htmlContent) {
      alert('Please fill in subject and content')
      return
    }

    if (!emailForm.sendToAll && emailForm.selectedCreators.length === 0) {
      alert('Please select creators or choose "Send to All"')
      return
    }

    setSending(true)
    setSendResults(null)

    try {
      const requestBody = {
        subject: emailForm.subject,
        htmlContent: emailForm.htmlContent,
        textContent: emailForm.textContent,
        sendToAll: emailForm.sendToAll
      }

      if (!emailForm.sendToAll) {
        requestBody.recipients = creators
          .filter(c => emailForm.selectedCreators.includes(c.id))
          .map(c => ({ name: c.name, email: c.email, id: c.id }))
      }

      const response = await apiFetch('/api/admin/send-email', {
        method: 'POST',
        token,
        body: requestBody
      })

      setSendResults(response)
      
      if (response.success) {
        alert(`✅ Email sent successfully to ${response.totalSent} creators!`)
        // Reset form
        setEmailForm({
          subject: '',
          htmlContent: '',
          textContent: '',
          sendToAll: false,
          selectedCreators: []
        })
        setSelectedTemplate(null)
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      alert(`❌ Failed to send email: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  const previewEmail = () => {
    const previewWindow = window.open('', '_blank')
    const previewContent = emailForm.htmlContent.replace(/{{CREATOR_NAME}}/g, 'Preview User')
    previewWindow.document.write(previewContent)
    previewWindow.document.close()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-96 bg-gray-300 rounded"></div>
              <div className="h-96 bg-gray-300 rounded"></div>
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
            📧 Email Management
          </h1>
          <p className="text-gray-600">
            Send emails and announcements to your creators
          </p>
        </div>

        {/* Send Results */}
        {sendResults && (
          <div className={`mb-6 p-4 rounded-lg ${sendResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className={`font-semibold ${sendResults.success ? 'text-green-800' : 'text-red-800'}`}>
              {sendResults.success ? '✅ Email Sent Successfully!' : '❌ Email Send Failed'}
            </h3>
            <p className={`text-sm ${sendResults.success ? 'text-green-700' : 'text-red-700'}`}>
              {sendResults.message}
            </p>
            {sendResults.results && (
              <div className="mt-2 text-sm text-gray-600">
                <p>Successful: {sendResults.results.successful}</p>
                <p>Failed: {sendResults.results.failed}</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Email Composer */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Compose Email</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Email Templates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Templates
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => selectTemplate(template)}
                      className={`text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                        selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{template.name}</div>
                      <div className="text-sm text-gray-500">{template.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email subject..."
                />
              </div>

              {/* HTML Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Content (HTML) *
                </label>
                <textarea
                  value={emailForm.htmlContent}
                  onChange={(e) => setEmailForm({ ...emailForm, htmlContent: e.target.value })}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Enter HTML content... Use {{CREATOR_NAME}} for personalization"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {{CREATOR_NAME}} to personalize emails with creator names
                </p>
              </div>

              {/* Preview Button */}
              <button
                onClick={previewEmail}
                disabled={!emailForm.htmlContent}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👁️ Preview Email
              </button>
            </div>
          </div>

          {/* Recipients Selection */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recipients</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Send to All Option */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sendToAll"
                  checked={emailForm.sendToAll}
                  onChange={(e) => setEmailForm({ ...emailForm, sendToAll: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="sendToAll" className="ml-2 text-sm font-medium text-gray-700">
                  Send to All Active Creators ({creators.length} creators)
                </label>
              </div>

              {/* Creator Filter */}
              {!emailForm.sendToAll && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter Creators
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <select
                        value={creatorFilter.status}
                        onChange={(e) => setCreatorFilter({ ...creatorFilter, status: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Statuses</option>
                        <option value="APPROVED">Approved</option>
                        <option value="PENDING">Pending</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                      
                      <select
                        value={creatorFilter.isActive}
                        onChange={(e) => setCreatorFilter({ ...creatorFilter, isActive: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Creators</option>
                        <option value="true">Active Only</option>
                        <option value="false">Inactive Only</option>
                      </select>
                    </div>
                  </div>

                  {/* Creator Selection */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Select Creators ({emailForm.selectedCreators.length} selected)
                      </label>
                      <div className="space-x-2">
                        <button
                          onClick={selectAllCreators}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          Select All
                        </button>
                        <button
                          onClick={clearSelection}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                      {creators.map((creator) => (
                        <div key={creator.id} className="flex items-center p-3 border-b border-gray-100 last:border-b-0">
                          <input
                            type="checkbox"
                            id={creator.id}
                            checked={emailForm.selectedCreators.includes(creator.id)}
                            onChange={(e) => handleCreatorSelection(creator.id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={creator.id} className="ml-3 flex-1 cursor-pointer">
                            <div className="text-sm font-medium text-gray-900">{creator.name}</div>
                            <div className="text-xs text-gray-500">{creator.email}</div>
                            <div className="text-xs text-gray-400">
                              {creator.applicationStatus} • {creator.isActive ? 'Active' : 'Inactive'}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={sendEmail}
                disabled={sending || !emailForm.subject || !emailForm.htmlContent}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending Emails...
                  </>
                ) : (
                  `📧 Send Email${emailForm.sendToAll ? ' to All Creators' : ` to ${emailForm.selectedCreators.length} Creator${emailForm.selectedCreators.length !== 1 ? 's' : ''}`}`
                )}
              </button>

              {/* Send Summary */}
              {emailForm.sendToAll && (
                <div className="text-center text-sm text-gray-600">
                  Will send to {creators.length} active creators
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Email Templates Preview */}
        {selectedTemplate && (
          <div className="mt-8 bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Template Preview: {selectedTemplate.name}</h2>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2"><strong>Subject:</strong> {selectedTemplate.subject}</p>
                <p className="text-sm text-gray-600"><strong>Description:</strong> {selectedTemplate.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => selectTemplate(templates.find(t => t.id === 'maintenance_notice'))}
                className="p-4 border border-orange-200 rounded-lg hover:bg-orange-50 text-left"
              >
                <div className="text-orange-600 font-medium">🔧 Send Maintenance Notice</div>
                <div className="text-sm text-gray-600 mt-1">Notify about analytics issues</div>
              </button>
              
              <button
                onClick={() => setEmailForm({ ...emailForm, sendToAll: true })}
                className="p-4 border border-blue-200 rounded-lg hover:bg-blue-50 text-left"
              >
                <div className="text-blue-600 font-medium">📢 Broadcast to All</div>
                <div className="text-sm text-gray-600 mt-1">Send to all active creators</div>
              </button>
              
              <button
                onClick={previewEmail}
                disabled={!emailForm.htmlContent}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50"
              >
                <div className="text-gray-600 font-medium">👁️ Preview Email</div>
                <div className="text-sm text-gray-600 mt-1">See how it will look</div>
              </button>
            </div>
          </div>
        </div>

        {/* Creator Statistics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Creators</p>
                <p className="text-2xl font-semibold text-gray-900">{creators.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Creators</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {creators.filter(c => c.isActive).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {creators.filter(c => c.applicationStatus === 'APPROVED').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Selected</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {emailForm.sendToAll ? creators.length : emailForm.selectedCreators.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
