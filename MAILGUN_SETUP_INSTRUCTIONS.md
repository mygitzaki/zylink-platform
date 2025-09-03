# 📬 Mailgun Setup Instructions - Step by Step

## **Step 1: Get Your Mailgun Credentials**

### 🔑 **Find Your API Key:**
1. Go to https://app.mailgun.com
2. Sign in to your account
3. Click **"API Keys"** in the left sidebar
4. Copy your **"Private API key"** (starts with `key-`)
   - Example: `key-1234567890abcdef1234567890abcdef`

### 🌐 **Find Your Domain:**
1. In Mailgun dashboard, click **"Domains"** 
2. Copy your domain name
   - Example: `mg.yourdomain.com` or `mail.zylike.com`

## **Step 2: Update the Email Script**

Open `send-maintenance-email.js` and update these lines:

```javascript
const MAILGUN_CONFIG = {
  apiKey: 'key-YOUR_ACTUAL_API_KEY',        // Replace with your API key
  domain: 'mg.yourdomain.com',              // Replace with your domain
  fromEmail: 'Zylike Team <noreply@zylike.com>'
};
```

## **Step 3: Test Send First**

### 🧪 **Send Test Email:**

1. **Update the test email** in `send-maintenance-email.js`:
   ```javascript
   // Change this line:
   await sendMaintenanceEmail('your-email@example.com', 'Test User');
   // To your actual email:
   await sendMaintenanceEmail('your-actual-email@gmail.com', 'Test User');
   ```

2. **Uncomment the test line:**
   ```javascript
   // Change this:
   // await testSend();
   // To this:
   await testSend();
   ```

3. **Run the test:**
   ```bash
   node send-maintenance-email.js
   ```

4. **Check your inbox** for the test email

## **Step 4: Prepare Creator List**

### 📋 **Option A: Manual List (Small Number of Creators)**

Update the `EXAMPLE_CREATORS` array in the script:

```javascript
const EXAMPLE_CREATORS = [
  { name: 'John Doe', email: 'john@example.com' },
  { name: 'Jane Smith', email: 'jane@example.com' },
  // Add all your creators here...
];
```

### 📊 **Option B: Database Export (Large Number of Creators)**

If you have many creators, export from your database:

```sql
-- Run this in your database admin panel
SELECT name, email 
FROM "Creator" 
WHERE "isActive" = true 
AND "applicationStatus" = 'APPROVED'
AND email IS NOT NULL
ORDER BY name;
```

Then format as JSON:
```javascript
const creators = [
  { name: 'Creator Name 1', email: 'email1@example.com' },
  { name: 'Creator Name 2', email: 'email2@example.com' },
  // ... more creators
];
```

## **Step 5: Send to All Creators**

### 🚀 **Bulk Send Process:**

1. **Update creator list** in `send-maintenance-email.js`
2. **Uncomment bulk send line:**
   ```javascript
   // Change this:
   // await sendToAllCreators(EXAMPLE_CREATORS);
   // To this:
   await sendToAllCreators(EXAMPLE_CREATORS);
   ```
3. **Run the bulk send:**
   ```bash
   node send-maintenance-email.js
   ```

## **Step 6: Monitor Results**

### 📊 **What to Watch For:**

- ✅ **Success count**: Number of emails sent successfully
- ❌ **Failed count**: Number of failed sends
- 📋 **Error details**: Specific failure reasons
- ⏱️ **Rate limiting**: 1 second delay between emails

### 🔍 **Check Mailgun Dashboard:**

1. Go to https://app.mailgun.com
2. Click **"Logs"** to see delivery status
3. Monitor **bounce rates** and **delivery rates**

## **Alternative Methods**

### 🖱️ **Method 1: Mailgun Dashboard (GUI)**

1. **Log into Mailgun**
2. **Click "Send"** → **"Compose"**
3. **Paste the HTML content**
4. **Upload creator email list**
5. **Send campaign**

### 📝 **Method 2: Simple cURL Command**

```bash
# Replace with your credentials and recipient
curl -s --user 'api:YOUR_API_KEY' \
  https://api.mailgun.net/v3/YOUR_DOMAIN/messages \
  -F from='Zylike Team <noreply@zylike.com>' \
  -F to='creator@example.com' \
  -F subject='🔧 Important Notice: Temporary Analytics Display Issues (Your Earnings Are Safe!)' \
  -F html@creator-maintenance-email.html
```

## **Troubleshooting**

### ❌ **Common Issues:**

1. **"Forbidden" Error**
   - Check your API key is correct
   - Verify domain is verified in Mailgun

2. **"Domain not found"**
   - Confirm domain spelling
   - Check domain is active in Mailgun

3. **High bounce rate**
   - Verify email addresses are correct
   - Check for typos in creator list

4. **Rate limit exceeded**
   - Increase delay between sends
   - Upgrade Mailgun plan if needed

### 🆘 **Need Help?**

- **Mailgun Support**: https://help.mailgun.com
- **Mailgun Status**: https://status.mailgun.com
- **API Documentation**: https://documentation.mailgun.com

---

## 📋 **Quick Checklist Before Sending**

- [ ] Mailgun API key configured
- [ ] Mailgun domain configured  
- [ ] Test email sent and received
- [ ] Creator list prepared
- [ ] Email content reviewed
- [ ] Timeline updated in message
- [ ] Support email confirmed
- [ ] Ready for bulk send

---

**⚠️ Important**: Always send a test email to yourself first before bulk sending!
