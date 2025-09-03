# Mailgun Email Sending Guide: Creator Maintenance Notice

## 🚀 Quick Start: Send via Mailgun API

### Option 1: Using cURL (Recommended for Quick Send)

```bash
# Replace YOUR_API_KEY and YOUR_DOMAIN with your actual Mailgun credentials

curl -s --user 'api:YOUR_API_KEY' \
  https://api.mailgun.net/v3/YOUR_DOMAIN/messages \
  -F from='Zylike Team <noreply@zylike.com>' \
  -F to='creator@example.com' \
  -F subject='🔧 Important Notice: Temporary Analytics Display Issues (Your Earnings Are Safe!)' \
  -F html='<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analytics Maintenance Notice</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .highlight { background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔧 Analytics Maintenance Notice</h1>
        <p>Important information about your dashboard</p>
    </div>
    
    <div class="content">
        <p>Dear Valued Creator,</p>
        
        <p>We hope this message finds you well! We'\''re writing to inform you about some temporary display issues you might notice in your analytics and earnings dashboard this week.</p>
        
        <div class="warning">
            <h3>🔍 What You Might See</h3>
            <ul>
                <li><strong>Unusual numbers</strong> in your analytics dashboard</li>
                <li><strong>Inconsistent data</strong> between different pages</li>
                <li><strong>Missing or fluctuating sales figures</strong></li>
                <li><strong>Temporary display errors</strong> in earnings calculations</li>
                <li><strong>Loading delays</strong> on analytics pages</li>
            </ul>
        </div>
        
        <div class="highlight">
            <h3>💰 Your Earnings Are 100% Safe</h3>
            <p><strong>IMPORTANT</strong>: Please don'\''t worry! These are purely <strong>display issues</strong> and do <strong>NOT</strong> affect your actual earnings:</p>
            <ul>
                <li>✅ <strong>All your commissions are completely saved and reserved</strong></li>
                <li>✅ <strong>Every sale you'\''ve generated is securely tracked</strong></li>
                <li>✅ <strong>Your payment eligibility remains unchanged</strong></li>
                <li>✅ <strong>No earnings data has been lost or modified</strong></li>
                <li>✅ <strong>All pending payments are protected</strong></li>
            </ul>
        </div>
        
        <h3>🛠️ What We'\''re Doing</h3>
        <p>Our technical team is working around the clock to:</p>
        <ul>
            <li><strong>Optimize data synchronization</strong> with our affiliate partners</li>
            <li><strong>Improve analytics accuracy</strong> and real-time reporting</li>
            <li><strong>Enhance security measures</strong> to protect your data</li>
            <li><strong>Upgrade performance</strong> for faster dashboard loading</li>
            <li><strong>Strengthen data validation</strong> systems</li>
        </ul>
        
        <h3>⏰ Expected Resolution</h3>
        <p>We expect these display issues to be fully resolved by <strong>[INSERT DATE - typically within 3-5 business days]</strong>. During this time:</p>
        <ul>
            <li><strong>Continue promoting your links</strong> - all tracking is working normally</li>
            <li><strong>Your commissions are being recorded</strong> accurately behind the scenes</li>
            <li><strong>Payment processing</strong> continues as usual</li>
            <li><strong>Support is available</strong> if you have any concerns</li>
        </ul>
        
        <h3>📞 Need Help?</h3>
        <p>If you have any questions or concerns about your earnings, please don'\''t hesitate to reach out:</p>
        <ul>
            <li><strong>Email</strong>: support@zylike.com</li>
            <li><strong>Dashboard</strong>: Use the "Contact Support" feature</li>
            <li><strong>Response Time</strong>: Within 24 hours</li>
        </ul>
        
        <a href="mailto:support@zylike.com" class="button">Contact Support</a>
        
        <h3>🙏 Thank You for Your Patience</h3>
        <p>We sincerely apologize for any confusion these temporary display issues may cause. Your trust is important to us, and we'\''re committed to providing you with the most accurate and reliable analytics platform possible.</p>
        
        <p>Thank you for being a valued member of the Zylike creator community!</p>
        
        <p><strong>Best regards,</strong><br>
        The Zylike Team</p>
        
        <div class="highlight">
            <h4>📱 Quick Reminder</h4>
            <p>Keep sharing your affiliate links - everything is working perfectly behind the scenes, and your earnings continue to grow!</p>
        </div>
    </div>
    
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.<br>
        For support, use the contact methods listed above.</p>
        <p>© 2025 Zylike. All rights reserved.</p>
    </div>
</body>
</html>'
```

### Option 2: Using Node.js Script (For Bulk Sending)

Create a file `send-maintenance-notice.js`:

```javascript
const axios = require('axios');
const FormData = require('form-data');

// Mailgun Configuration
const MAILGUN_API_KEY = 'YOUR_API_KEY';
const MAILGUN_DOMAIN = 'YOUR_DOMAIN';
const FROM_EMAIL = 'Zylike Team <noreply@zylike.com>';

// Email Content
const emailSubject = '🔧 Important Notice: Temporary Analytics Display Issues (Your Earnings Are Safe!)';
const emailHTML = `[INSERT HTML CONTENT FROM ABOVE]`;

async function sendMaintenanceNotice(creatorEmail, creatorName) {
    try {
        const form = new FormData();
        form.append('from', FROM_EMAIL);
        form.append('to', `${creatorName} <${creatorEmail}>`);
        form.append('subject', emailSubject);
        form.append('html', emailHTML.replace('Dear Valued Creator', `Dear ${creatorName}`));
        
        const response = await axios.post(
            `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
            form,
            {
                auth: {
                    username: 'api',
                    password: MAILGUN_API_KEY
                },
                headers: form.getHeaders()
            }
        );
        
        console.log(`✅ Email sent to ${creatorEmail}:`, response.data);
        return { success: true, messageId: response.data.id };
    } catch (error) {
        console.error(`❌ Failed to send email to ${creatorEmail}:`, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

// Example usage:
async function sendToAllCreators() {
    const creators = [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Smith', email: 'jane@example.com' },
        // Add more creators...
    ];
    
    for (const creator of creators) {
        await sendMaintenanceNotice(creator.email, creator.name);
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Run the bulk send
sendToAllCreators();
```

### Option 3: Using Mailgun Dashboard (Manual)

1. **Log into Mailgun Dashboard**
   - Go to https://app.mailgun.com
   - Navigate to your domain

2. **Create Email Campaign**
   - Click "Send" → "Compose"
   - Add the subject and HTML content
   - Upload your creator list

3. **Send Test Email First**
   - Send to yourself to verify formatting
   - Check spam folder

## 🎯 Step-by-Step Mailgun Implementation

### Step 1: Prepare Your Mailgun Credentials

```bash
# Your Mailgun credentials (replace with actual values)
MAILGUN_API_KEY="your-api-key-here"
MAILGUN_DOMAIN="your-domain.mailgun.org"
FROM_EMAIL="Zylike Team <noreply@zylike.com>"
```

### Step 2: Get Creator List

```sql
-- SQL to get all active creators
SELECT name, email 
FROM "Creator" 
WHERE "isActive" = true 
AND "applicationStatus" = 'APPROVED'
AND email IS NOT NULL;
```

### Step 3: Send Test Email

```bash
# Test with your own email first
curl -s --user 'api:YOUR_API_KEY' \
  https://api.mailgun.net/v3/YOUR_DOMAIN/messages \
  -F from='Zylike Team <noreply@zylike.com>' \
  -F to='your-email@example.com' \
  -F subject='🔧 TEST: Analytics Maintenance Notice' \
  -F html='[HTML CONTENT FROM ABOVE]'
```

### Step 4: Bulk Send (Python Script)

```python
import requests
import time
import json

def send_maintenance_email(api_key, domain, creator_email, creator_name):
    return requests.post(
        f"https://api.mailgun.net/v3/{domain}/messages",
        auth=("api", api_key),
        data={
            "from": "Zylike Team <noreply@zylike.com>",
            "to": f"{creator_name} <{creator_email}>",
            "subject": "🔧 Important Notice: Temporary Analytics Display Issues (Your Earnings Are Safe!)",
            "html": """[HTML CONTENT FROM ABOVE]"""
        }
    )

# Load creator list and send
creators = [
    {"name": "Creator Name", "email": "creator@example.com"},
    # Add more creators...
]

for creator in creators:
    result = send_maintenance_email(
        "YOUR_API_KEY", 
        "YOUR_DOMAIN", 
        creator["email"], 
        creator["name"]
    )
    
    if result.status_code == 200:
        print(f"✅ Sent to {creator['email']}")
    else:
        print(f"❌ Failed to send to {creator['email']}: {result.text}")
    
    # Rate limiting - 1 email per second
    time.sleep(1)
```

## 📊 Delivery Best Practices

### Timing
- **Best Time**: Tuesday-Thursday, 10 AM - 2 PM (recipient's timezone)
- **Avoid**: Mondays, Fridays, weekends, holidays

### Rate Limiting
- **Mailgun Free**: 100 emails/hour
- **Mailgun Paid**: Higher limits
- **Recommendation**: 1 email per second to be safe

### Tracking
- Enable **open tracking** to see who read the message
- Enable **click tracking** for support links
- Monitor **bounce rates** and update email list

## 🔧 Technical Implementation

### Environment Variables
```bash
# Add to your .env file
MAILGUN_API_KEY=your_api_key_here
MAILGUN_DOMAIN=your_domain.mailgun.org
SUPPORT_EMAIL=support@zylike.com
```

### Database Query for Creator List
```javascript
// Get all active creators for bulk send
const creators = await prisma.creator.findMany({
  where: {
    isActive: true,
    applicationStatus: 'APPROVED',
    email: { not: null }
  },
  select: {
    name: true,
    email: true,
    createdAt: true
  }
});
```

## 📝 Pre-Send Checklist

- [ ] **Test email sent** to yourself
- [ ] **HTML renders correctly** in different email clients
- [ ] **Links work** (support email, dashboard links)
- [ ] **Mailgun credentials** are correct
- [ ] **Creator list** is up to date
- [ ] **Rate limiting** is configured
- [ ] **Tracking** is enabled
- [ ] **Backup plan** ready if issues arise

## 🚨 Emergency Stop

If you need to stop the bulk send:
- **API**: Cancel the script/process
- **Dashboard**: Use Mailgun's campaign controls
- **Support**: Contact Mailgun support for immediate help

---

## 📞 Support Information

**Mailgun Support**: https://help.mailgun.com
**Documentation**: https://documentation.mailgun.com
**API Reference**: https://documentation.mailgun.com/en/latest/api_reference.html
