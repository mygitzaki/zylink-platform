import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'

export default function LinkGeneratorPage() {
  const { token } = useAuth()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('general')
  const [customTitle, setCustomTitle] = useState('')

  async function generateLink(e) {
    e.preventDefault()
    if (!url.trim()) return
    
    setLoading(true)
    setError('')
    setResult(null)
    
    try {
      const response = await apiFetch('/api/creator/links', {
        method: 'POST',
        body: { 
          destinationUrl: url,
          category: category,
          customTitle: customTitle || undefined
        },
        token
      })
      setResult(response)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    // Could add a toast notification here
  }

  function resetForm() {
    setUrl('')
    setCustomTitle('')
    setCategory('general')
    setResult(null)
    setError('')
  }

  function downloadQR() {
    if (result?.qrCode) {
      const link = document.createElement('a')
      link.href = result.qrCode
      link.download = `qr-${result.shortCode}.png`
      link.click()
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Link Generator</h1>
          <p className="dashboard-subtitle">Create new affiliate links with advanced options</p>
        </div>
      </div>

      <div className="link-generator-layout">
        {/* URL Input Form */}
        <div className="generator-section">
          <div className="section-header">
            <h2 className="section-title">URL Input Form</h2>
            <p className="section-subtitle">Enter your destination URL and customize your link</p>
          </div>

          <form onSubmit={generateLink} className="generator-form">
            <div className="form-field">
              <label>Destination URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.amazon.com/product/..."
                className="form-input"
                required
              />
              <small>The URL you want to promote</small>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>Link Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-input"
                >
                  <option value="general">General</option>
                  <option value="fashion">Fashion & Beauty</option>
                  <option value="tech">Technology</option>
                  <option value="home">Home & Garden</option>
                  <option value="health">Health & Wellness</option>
                  <option value="sports">Sports & Fitness</option>
                  <option value="travel">Travel</option>
                  <option value="food">Food & Dining</option>
                </select>
              </div>

              <div className="form-field">
                <label>Custom Title (Optional)</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g., Best Wireless Headphones"
                  className="form-input"
                />
                <small>Helps you identify this link later</small>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                disabled={loading || !url.trim()}
                className="primary-btn large"
              >
                {loading ? 'Generating Link...' : 'Generate Affiliate Link'}
              </button>
              {result && (
                <button 
                  type="button"
                  onClick={resetForm}
                  className="secondary-btn"
                >
                  Create Another Link
                </button>
              )}
            </div>
          </form>

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Link Preview & Results */}
        {result && (
          <div className="generator-section">
            <div className="section-header">
              <h2 className="section-title">Link Preview</h2>
              <p className="section-subtitle">Your generated affiliate links are ready to use</p>
            </div>

            <div className="link-preview">
              <div className="preview-card success">
                <div className="preview-header">
                  <div className="success-icon">✅</div>
                  <h3>Link Generated Successfully!</h3>
                </div>

                <div className="link-details">
                  <div className="detail-item">
                    <label>Original URL</label>
                    <div className="link-display">
                      <span className="link-text original">{url}</span>
                    </div>
                  </div>

                  <div className="detail-item">
                    <label>Short Link</label>
                    <div className="link-display">
                      <span className="link-text">{result.shortLink}</span>
                      <div className="link-actions">
                        <button 
                          onClick={() => copyToClipboard(result.shortLink)}
                          className="copy-btn"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                        <button 
                          onClick={() => window.open(result.shortLink, '_blank')}
                          className="test-btn"
                        >
                          Test
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="detail-item">
                    <label>Impact.com Link</label>
                    <div className="link-display">
                      <span className="link-text">{result.impactLink}</span>
                      <div className="link-actions">
                        <button 
                          onClick={() => copyToClipboard(result.impactLink)}
                          className="copy-btn"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>

                  {customTitle && (
                    <div className="detail-item">
                      <label>Custom Title</label>
                      <div className="custom-title">{customTitle}</div>
                    </div>
                  )}

                  <div className="detail-item">
                    <label>Category</label>
                    <div className="category-badge">{category}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Options */}
        {result && (
          <div className="generator-section">
            <div className="section-header">
              <h2 className="section-title">Download Options</h2>
              <p className="section-subtitle">QR codes and downloadable assets</p>
            </div>

            <div className="download-options">
              <div className="qr-section">
                <div className="qr-container">
                  <div className="qr-placeholder">
                    <svg width="150" height="150" viewBox="0 0 150 150" fill="none">
                      <rect width="150" height="150" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="2" rx="8"/>
                      <rect x="20" y="20" width="15" height="15" fill="#1f2937"/>
                      <rect x="40" y="20" width="15" height="15" fill="#1f2937"/>
                      <rect x="60" y="20" width="15" height="15" fill="#1f2937"/>
                      <rect x="80" y="20" width="15" height="15" fill="#1f2937"/>
                      <rect x="100" y="20" width="15" height="15" fill="#1f2937"/>
                      <rect x="20" y="40" width="15" height="15" fill="#1f2937"/>
                      <rect x="100" y="40" width="15" height="15" fill="#1f2937"/>
                      <rect x="20" y="60" width="15" height="15" fill="#1f2937"/>
                      <rect x="40" y="60" width="15" height="15" fill="#1f2937"/>
                      <rect x="60" y="60" width="15" height="15" fill="#1f2937"/>
                      <rect x="80" y="60" width="15" height="15" fill="#1f2937"/>
                      <rect x="100" y="60" width="15" height="15" fill="#1f2937"/>
                      <rect x="20" y="80" width="15" height="15" fill="#1f2937"/>
                      <rect x="100" y="80" width="15" height="15" fill="#1f2937"/>
                      <rect x="20" y="100" width="15" height="15" fill="#1f2937"/>
                      <rect x="40" y="100" width="15" height="15" fill="#1f2937"/>
                      <rect x="60" y="100" width="15" height="15" fill="#1f2937"/>
                      <rect x="80" y="100" width="15" height="15" fill="#1f2937"/>
                      <rect x="100" y="100" width="15" height="15" fill="#1f2937"/>
                    </svg>
                  </div>
                  <div className="qr-info">
                    <h4>QR Code</h4>
                    <p>Scan to visit your short link</p>
                  </div>
                </div>

                <div className="download-actions">
                  <button 
                    onClick={downloadQR}
                    className="download-btn"
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PNG
                  </button>
                  <button 
                    onClick={downloadQR}
                    className="download-btn secondary"
                  >
                    Download SVG
                  </button>
                </div>
              </div>

              <div className="share-options">
                <h4>Quick Share</h4>
                <div className="share-buttons">
                  <button 
                    onClick={() => copyToClipboard(result.shortLink)}
                    className="share-btn"
                  >
                    📋 Copy Link
                  </button>
                  <button 
                    onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(result.shortLink)}`, '_blank')}
                    className="share-btn"
                  >
                    🐦 Tweet
                  </button>
                  <button 
                    onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(result.shortLink)}`, '_blank')}
                    className="share-btn"
                  >
                    📘 Facebook
                  </button>
                  <button 
                    onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(result.shortLink)}`, '_blank')}
                    className="share-btn"
                  >
                    💼 LinkedIn
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Link Performance Preview */}
        {result && (
          <div className="generator-section">
            <div className="section-header">
              <h2 className="section-title">Performance Tracking</h2>
              <p className="section-subtitle">Monitor your link's performance</p>
            </div>

            <div className="performance-preview">
              <div className="performance-metrics">
                <div className="metric-card">
                  <div className="metric-icon">👆</div>
                  <div className="metric-info">
                    <div className="metric-value">0</div>
                    <div className="metric-label">Clicks</div>
                  </div>
                </div>
                
                <div className="metric-card">
                  <div className="metric-icon">🎯</div>
                  <div className="metric-info">
                    <div className="metric-value">0%</div>
                    <div className="metric-label">CTR</div>
                  </div>
                </div>
                
                <div className="metric-card">
                  <div className="metric-icon">💰</div>
                  <div className="metric-info">
                    <div className="metric-value">$0.00</div>
                    <div className="metric-label">Earned</div>
                  </div>
                </div>
              </div>

              <div className="tracking-info">
                <h4>🔍 What We Track</h4>
                <ul>
                  <li>Real-time click tracking</li>
                  <li>Geographic data of visitors</li>
                  <li>Conversion rates and earnings</li>
                  <li>Device and browser analytics</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}




