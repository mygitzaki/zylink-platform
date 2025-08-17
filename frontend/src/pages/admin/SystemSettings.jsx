export default function SystemSettings(){
  return (
    <div className="modern-admin-container">
      <div className="admin-header-modern">
        <div>
          <h1 className="admin-title-modern">System Settings</h1>
          <p className="admin-subtitle-modern">Configure platform settings and policies</p>
        </div>
      </div>
      
      <div className="settings-grid">
        <div className="setting-group">
          <h3 className="setting-group-title">Platform Configuration</h3>
          <div className="setting-item">
            <label>Default Commission Rate</label>
            <input type="number" defaultValue="70" className="setting-input" />
            <span className="setting-description">Default commission rate for new creators (%)</span>
          </div>
          <div className="setting-item">
            <label>Minimum Payout Amount</label>
            <input type="number" defaultValue="50" className="setting-input" />
            <span className="setting-description">Minimum amount required for payout ($)</span>
          </div>
        </div>

        <div className="setting-group">
          <h3 className="setting-group-title">Referral Program</h3>
          <div className="setting-item">
            <label>Referral Bonus Rate</label>
            <input type="number" defaultValue="10" className="setting-input" />
            <span className="setting-description">Percentage of earnings shared with referrer (%)</span>
          </div>
          <div className="setting-item">
            <label>Referral Duration</label>
            <input type="number" defaultValue="6" className="setting-input" />
            <span className="setting-description">Number of months referral bonus applies</span>
          </div>
        </div>

        <div className="setting-group">
          <h3 className="setting-group-title">Application Review</h3>
          <div className="setting-item">
            <label>Auto-approve Applications</label>
            <input type="checkbox" className="setting-checkbox" />
            <span className="setting-description">Automatically approve creator applications that meet criteria</span>
          </div>
          <div className="setting-item">
            <label>Minimum Follower Count</label>
            <input type="number" defaultValue="1000" className="setting-input" />
            <span className="setting-description">Minimum social media followers required</span>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="save-settings-btn">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Save Settings
        </button>
        <button className="reset-settings-btn">
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}




