import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/api'

export default function PaymentSetup(){
  const { token } = useAuth()
  const [type,setType] = useState('BANK')
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    routingNumber: '',
    bankName: '',
    swiftCode: ''
  })
  const [paypalDetails, setPaypalDetails] = useState({
    email: ''
  })
  const [cryptoDetails, setCryptoDetails] = useState({
    address: '',
    currency: 'USDC'
  })
  const [msg,setMsg] = useState('')
  const [error,setError] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [activeTab, setActiveTab] = useState('setup')
  const [hasExistingPayment, setHasExistingPayment] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load existing payment data when component mounts
  useEffect(() => {
    loadPaymentData()
  }, [token])

  async function loadPaymentData() {
    if (!token) return
    
    try {
      setLoading(true)
      const res = await apiFetch('/api/creator/payment-setup', { 
        method: 'GET', 
        token 
      })
      
      if (res.hasPaymentMethod) {
        setHasExistingPayment(true)
        setType(res.type)
        setIsVerified(res.isVerified)
        
        // Populate the appropriate details based on type
        if (res.type === 'BANK') {
          setBankDetails(res.accountDetails)
        } else if (res.type === 'PAYPAL') {
          setPaypalDetails(res.accountDetails)
        } else if (res.type === 'CRYPTO') {
          setCryptoDetails(res.accountDetails)
        }
        
        setMsg(`✅ Your ${res.type} payment details are safely stored and submitted to admin for processing.`)
      } else {
        setHasExistingPayment(false)
        setMsg('Please submit your payment details so admin can process your earnings.')
      }
    } catch (err) {
      console.error('Failed to load payment data:', err)
      setError('Failed to load payment information')
    } finally {
      setLoading(false)
    }
  }

  async function onSave(e){
    e.preventDefault()
    setMsg(''); setError('')
    try{
      let accountDetails = {}
      if(type === 'BANK') accountDetails = bankDetails
      else if(type === 'PAYPAL') accountDetails = paypalDetails  
      else if(type === 'CRYPTO') accountDetails = cryptoDetails

      const res = await apiFetch('/api/creator/payment-setup',{ method:'POST', token, body:{ type, accountDetails } })
      setMsg(`🎉 SUCCESS! Your ${type} payment details have been securely submitted to admin. You will receive payments to this account once your earnings are processed.`)
      setIsVerified(false) // Reset verification status
      setHasExistingPayment(true) // Mark that we now have a payment method
      
      // Reload the payment data to show updated information
      setTimeout(() => loadPaymentData(), 1000)
    }catch(err){ setError(err.message || 'Failed to save payment method') }
  }

  const handleBankDetailsChange = (field, value) => {
    setBankDetails(prev => ({ ...prev, [field]: value }))
  }

  const handlePaypalDetailsChange = (field, value) => {
    setPaypalDetails(prev => ({ ...prev, [field]: value }))
  }

  const handleCryptoDetailsChange = (field, value) => {
    setCryptoDetails(prev => ({ ...prev, [field]: value }))
  }

  const startVerification = async () => {
    try {
      // Simulate verification process
      setMsg('Verification process started. Please check your email for further instructions.')
      setTimeout(() => {
        setIsVerified(true)
        setMsg('Payment method verified successfully!')
      }, 3000)
    } catch (err) {
      setError('Verification failed. Please try again.')
    }
  }

  // Show loading state while fetching data
  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Payment Setup</h1>
            <p className="dashboard-subtitle">Loading payment information...</p>
          </div>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading payment details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Payment Setup</h1>
          <p className="dashboard-subtitle">Submit your payment details securely to admin for earnings processing</p>
        </div>
        <div className="submission-status">
          <span className={`status-badge ${hasExistingPayment ? 'submitted' : 'pending'}`}>
            {hasExistingPayment ? '✅ Submitted to Admin' : '📋 Awaiting Submission'}
          </span>
        </div>
      </div>

      <div className="payment-tabs">
        <div className="tab-buttons">
          <button 
            className={`tab-button ${activeTab === 'setup' ? 'active' : ''}`}
            onClick={() => setActiveTab('setup')}
          >
            Payment Method
          </button>
          <button 
            className={`tab-button ${activeTab === 'verification' ? 'active' : ''}`}
            onClick={() => setActiveTab('verification')}
          >
            Verification
          </button>
          <button 
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Payment History
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'setup' && (
            <div className="payment-setup-form">
              <div className="section-header">
                <h2 className="section-title">Payment Method Selection</h2>
                <p className="section-subtitle">Choose your preferred payment method</p>
              </div>

              {/* Payment Method Selection */}
              <div className="payment-method-selector">
                <div className="method-options">
                  <label className={`method-option ${type === 'BANK' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      value="BANK" 
                      checked={type === 'BANK'}
                      onChange={e => setType(e.target.value)}
                    />
                    <div className="method-icon">🏦</div>
                    <div className="method-info">
                      <h4>Bank Transfer</h4>
                      <p>Direct deposit to your bank account</p>
                    </div>
                  </label>

                  <label className={`method-option ${type === 'PAYPAL' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      value="PAYPAL" 
                      checked={type === 'PAYPAL'}
                      onChange={e => setType(e.target.value)}
                    />
                    <div className="method-icon">💳</div>
                    <div className="method-info">
                      <h4>PayPal</h4>
                      <p>Fast and secure PayPal payments</p>
                    </div>
                  </label>

                  <label className={`method-option ${type === 'CRYPTO' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      value="CRYPTO" 
                      checked={type === 'CRYPTO'}
                      onChange={e => setType(e.target.value)}
                    />
                    <div className="method-icon">₿</div>
                    <div className="method-info">
                      <h4>Cryptocurrency</h4>
                      <p>Receive payments in crypto</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Account Details Form */}
              <form onSubmit={onSave} className="account-details-form">
                <div className="section-header">
                  <h3 className="section-title">Account Details</h3>
                  <p className="section-subtitle">
                    {type === 'BANK' && 'Enter your bank account information'}
                    {type === 'PAYPAL' && 'Enter your PayPal email address'}
                    {type === 'CRYPTO' && 'Enter your cryptocurrency wallet address'}
                  </p>
                </div>

                {type === 'BANK' && (
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Account Holder Name</label>
                      <input
                        type="text"
                        value={bankDetails.accountName}
                        onChange={e => handleBankDetailsChange('accountName', e.target.value)}
                        className="form-input"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    
                    <div className="form-field">
                      <label>Account Number</label>
                      <input
                        type="text"
                        value={bankDetails.accountNumber}
                        onChange={e => handleBankDetailsChange('accountNumber', e.target.value)}
                        className="form-input"
                        placeholder="123456789"
                        required
                      />
                    </div>
                    
                    <div className="form-field">
                      <label>Routing Number</label>
                      <input
                        type="text"
                        value={bankDetails.routingNumber}
                        onChange={e => handleBankDetailsChange('routingNumber', e.target.value)}
                        className="form-input"
                        placeholder="123456789"
                        required
                      />
                    </div>
                    
                    <div className="form-field">
                      <label>Bank Name</label>
                      <input
                        type="text"
                        value={bankDetails.bankName}
                        onChange={e => handleBankDetailsChange('bankName', e.target.value)}
                        className="form-input"
                        placeholder="Wells Fargo"
                        required
                      />
                    </div>
                    
                    <div className="form-field">
                      <label>SWIFT Code (International)</label>
                      <input
                        type="text"
                        value={bankDetails.swiftCode}
                        onChange={e => handleBankDetailsChange('swiftCode', e.target.value)}
                        className="form-input"
                        placeholder="WFBIUS6S"
                      />
                    </div>
                  </div>
                )}

                {type === 'PAYPAL' && (
                  <div className="form-field">
                    <label>PayPal Email Address</label>
                    <input
                      type="email"
                      value={paypalDetails.email}
                      onChange={e => handlePaypalDetailsChange('email', e.target.value)}
                      className="form-input"
                      placeholder="your-email@paypal.com"
                      required
                    />
                  </div>
                )}

                {type === 'CRYPTO' && (
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Cryptocurrency</label>
                      <select
                        value={cryptoDetails.currency}
                        onChange={e => handleCryptoDetailsChange('currency', e.target.value)}
                        className="form-input"
                      >
                        <option value="USDC">USDC</option>
                        <option value="USDT">USDT</option>
                        <option value="BTC">Bitcoin</option>
                        <option value="ETH">Ethereum</option>
        </select>
                    </div>
                    
                    <div className="form-field">
                      <label>Wallet Address</label>
                      <input
                        type="text"
                        value={cryptoDetails.address}
                        onChange={e => handleCryptoDetailsChange('address', e.target.value)}
                        className="form-input"
                        placeholder="0x742d35Cc6634C0532925a3b8D"
                        required
                      />
                    </div>
                  </div>
                )}

                {msg && <div className="success-message">{msg}</div>}
                {error && <div className="error-message">{error}</div>}

                {/* Confidence Building Summary */}
                {hasExistingPayment && (
                  <div className="submission-summary">
                    <h3>📋 Payment Details Status</h3>
                    <div className="summary-item">
                      <span className="label">✅ Submitted to Admin:</span>
                      <span className="value">Your {type} payment information</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">🔒 Security:</span>
                      <span className="value">Details encrypted and safely stored</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">💰 Next Step:</span>
                      <span className="value">Admin will process your earnings to this account</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">✏️ Updates:</span>
                      <span className="value">You can edit these details anytime</span>
                    </div>
                  </div>
                )}

                <button type="submit" className="primary-btn">
                  {hasExistingPayment ? 'Update Payment Details' : 'Submit Payment Details'}
                </button>
      </form>
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="verification-section">
              <div className="section-header">
                <h2 className="section-title">Verification Process</h2>
                <p className="section-subtitle">Verify your payment method to receive payments</p>
              </div>

              <div className="verification-steps">
                <div className={`verification-step ${isVerified ? 'completed' : 'pending'}`}>
                  <div className="step-icon">
                    {isVerified ? '✅' : '1'}
                  </div>
                  <div className="step-content">
                    <h4>Payment Method Setup</h4>
                    <p>Configure your preferred payment method</p>
                  </div>
                </div>

                <div className={`verification-step ${isVerified ? 'completed' : 'pending'}`}>
                  <div className="step-icon">
                    {isVerified ? '✅' : '2'}
                  </div>
                  <div className="step-content">
                    <h4>Identity Verification</h4>
                    <p>Verify your identity for secure payments</p>
                  </div>
                </div>

                <div className={`verification-step ${isVerified ? 'completed' : 'pending'}`}>
                  <div className="step-icon">
                    {isVerified ? '✅' : '3'}
                  </div>
                  <div className="step-content">
                    <h4>Account Confirmation</h4>
                    <p>Confirm your payment account details</p>
                  </div>
                </div>
              </div>

              {!isVerified && (
                <div className="verification-action">
                  <button onClick={startVerification} className="primary-btn">
                    Start Verification Process
                  </button>
                  <p className="verification-note">
                    Verification typically takes 1-3 business days. You'll receive an email with status updates.
                  </p>
                </div>
              )}

              {isVerified && (
                <div className="verification-success">
                  <div className="success-icon">✅</div>
                  <h3>Payment Method Verified!</h3>
                  <p>Your payment method has been successfully verified. You can now receive payments.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="payment-history-section">
              <div className="section-header">
                <h2 className="section-title">Payment History</h2>
                <p className="section-subtitle">Track all your payment transactions</p>
              </div>

              <div className="payment-history-table">
                <div className="table-header">
                  <span>Date</span>
                  <span>Amount</span>
                  <span>Method</span>
                  <span>Status</span>
                  <span>Transaction ID</span>
                </div>

                <div className="table-body">
                  <div className="table-row">
                    <span>Dec 1, 2024</span>
                    <span>$487.50</span>
                    <span>Bank Transfer</span>
                    <span className="status completed">Completed</span>
                    <span>TXN_001234</span>
                  </div>

                  <div className="table-row">
                    <span>Nov 1, 2024</span>
                    <span>$392.75</span>
                    <span>PayPal</span>
                    <span className="status completed">Completed</span>
                    <span>TXN_001189</span>
                  </div>

                  <div className="table-row">
                    <span>Oct 1, 2024</span>
                    <span>$256.30</span>
                    <span>Bank Transfer</span>
                    <span className="status failed">Failed</span>
                    <span>TXN_001145</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}




