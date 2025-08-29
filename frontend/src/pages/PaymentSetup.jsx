import { useState, useEffect, useCallback } from 'react'
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
  const [msg,setMsg] = useState('')
  const [error,setError] = useState('')
  const [hasExistingPayment, setHasExistingPayment] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  // Load existing payment data when component mounts
  useEffect(() => {
    loadPaymentData()
  }, [token, loadPaymentData])

  const loadPaymentData = useCallback(async () => {
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
        
        // Populate the appropriate details based on type
        if (res.type === 'BANK') {
          setBankDetails(res.accountDetails)
        } else if (res.type === 'PAYPAL') {
          setPaypalDetails(res.accountDetails)
        }
        
        setMsg(`Your ${res.type === 'BANK' ? 'bank account' : 'PayPal'} details have been submitted successfully!`)
        setIsEditing(false)
      } else {
        setHasExistingPayment(false)
        setMsg('Please submit your payment details so admin can process your earnings.')
        setIsEditing(true)
      }
    } catch (err) {
      console.error('Failed to load payment data:', err)
      setError('Failed to load payment information')
    } finally {
      setLoading(false)
    }
  }, [token])

  async function onSave(e){
    e.preventDefault()
    setMsg(''); setError('')
    
    console.log('Form submission started')
    console.log('Current type:', type)
    console.log('Bank details:', bankDetails)
    console.log('PayPal details:', paypalDetails)
    
    // Validate required fields
    if (type === 'BANK') {
      if (!bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.routingNumber || !bankDetails.bankName) {
        setError('Please fill in all required bank account fields')
        return
      }
    } else if (type === 'PAYPAL') {
      if (!paypalDetails.email) {
        setError('Please enter your PayPal email address')
        return
      }
    }
    
    try{
      let accountDetails = {}
      if(type === 'BANK') accountDetails = bankDetails
      else if(type === 'PAYPAL') accountDetails = paypalDetails  

      console.log('Sending request with:', { type, accountDetails })
      
      const res = await apiFetch('/api/creator/payment-setup',{ method:'POST', token, body:{ type, accountDetails } })
      
      console.log('Response received:', res)
      
      setMsg(`SUCCESS! Your ${type === 'BANK' ? 'bank account' : 'PayPal'} details have been securely submitted!`)
      setHasExistingPayment(true) // Mark that we now have a payment method
      setIsEditing(false) // Exit editing mode
      
      // Reload the payment data to show updated information
      setTimeout(() => loadPaymentData(), 1000)
    }catch(err){ 
      console.error('Form submission error:', err)
      setError(err.message || 'Failed to save payment method') 
    }
  }

  const handleBankDetailsChange = (field, value) => {
    setBankDetails(prev => ({ ...prev, [field]: value }))
  }

  const handlePaypalDetailsChange = (field, value) => {
    setPaypalDetails(prev => ({ ...prev, [field]: value }))
  }

  const startEditing = () => {
    setIsEditing(true)
    setMsg('')
    setError('')
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setMsg('')
    setError('')
    // Reset form fields to original values
    loadPaymentData()
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
          <p className="dashboard-subtitle">Configure your payment method for earnings processing</p>
        </div>
        <div className="submission-status">
          <span className={`status-badge ${hasExistingPayment ? 'completed' : 'pending'}`}>
            {hasExistingPayment ? 'Payment Method Set' : 'Setup Required'}
          </span>
        </div>
      </div>

      <div className="payment-setup-content">
        {hasExistingPayment && !isEditing ? (
          <div className="payment-completed">
            <div className="section-header">
              <h2 className="section-title">Payment Method Configured</h2>
              <p className="section-subtitle">Your payment details are ready for processing</p>
            </div>
            
            <div className="payment-summary">
              <div className="payment-method-display">
                <div className="method-icon">
                  {type === 'BANK' ? 'Bank' : 'PayPal'}
                </div>
                <div className="method-details">
                  <h3>{type === 'BANK' ? 'Bank Account' : 'PayPal'}</h3>
                  {type === 'BANK' ? (
                    <p>Account ending in ***{bankDetails.accountNumber ? bankDetails.accountNumber.slice(-4) : ''}</p>
                  ) : (
                    <p>{paypalDetails.email}</p>
                  )}
                </div>
              </div>
              
              <div className="status-indicator">
                <span className="status-badge completed">Submitted to Admin</span>
              </div>
            </div>
            
            <div className="action-buttons">
              <button onClick={startEditing} className="secondary-btn">
                Edit Payment Method
              </button>
            </div>
          </div>
        ) : (
          <div className="payment-setup-form">
            <div className="section-header">
              <h2 className="section-title">
                {hasExistingPayment ? 'Edit Payment Method' : 'Setup Payment Method'}
              </h2>
              <p className="section-subtitle">Choose your preferred payment method</p>
            </div>

            <div className="payment-method-selector">
              <div className="method-options">
                <label className={`method-option ${type === 'BANK' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    value="BANK" 
                    checked={type === 'BANK'}
                    onChange={e => setType(e.target.value)}
                  />
                  <div className="method-icon">Bank</div>
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
                  <div className="method-icon">PayPal</div>
                  <div className="method-info">
                    <h4>PayPal</h4>
                    <p>Fast and secure PayPal payments</p>
                  </div>
                </label>
              </div>
            </div>

            <form onSubmit={onSave} className="account-details-form">
              <div className="section-header">
                <h3 className="section-title">Account Details</h3>
                <p className="section-subtitle">
                  {type === 'BANK' && 'Enter your bank account information'}
                  {type === 'PAYPAL' && 'Enter your PayPal email address'}
                </p>
              </div>

              {type === 'BANK' && (
                <div className="form-grid">
                  <div className="form-field">
                    <label>Account Holder Name *</label>
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
                    <label>Account Number *</label>
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
                    <label>Routing Number *</label>
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
                    <label>Bank Name *</label>
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
                  <label>PayPal Email Address *</label>
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

              {msg && <div className="success-message">{msg}</div>}
              {error && <div className="error-message">{error}</div>}

              <div className="form-actions">
                <button type="submit" className="primary-btn">
                  {hasExistingPayment ? 'Update Payment Details' : 'Submit Payment Details'}
                </button>
                {hasExistingPayment && (
                  <button type="button" onClick={cancelEditing} className="secondary-btn">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}