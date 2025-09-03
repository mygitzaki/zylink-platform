// Mailgun Email Sender for Creator Maintenance Notice
// Step-by-step implementation

const https = require('https');
const querystring = require('querystring');

// 🔧 STEP 1: Configure your Mailgun credentials here
const MAILGUN_CONFIG = {
  apiKey: 'YOUR_API_KEY_HERE',        // Replace with your actual API key
  domain: 'YOUR_DOMAIN_HERE',         // Replace with your actual domain (e.g., mg.yourdomain.com)
  fromEmail: 'Zylike Team <noreply@zylike.com>'
};

// 📧 Email content
const EMAIL_SUBJECT = '🔧 Important Notice: Temporary Analytics Display Issues (Your Earnings Are Safe!)';

const EMAIL_HTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analytics Maintenance Notice</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f4f4; }
        .container { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .highlight { background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        h1 { margin: 0; font-size: 24px; }
        h2 { color: #333; margin-top: 25px; }
        h3 { color: #555; margin-top: 20px; }
        ul { padding-left: 20px; }
        li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 Analytics Maintenance Notice</h1>
            <p>Important information about your dashboard</p>
        </div>
        
        <div class="content">
            <p>Dear {{CREATOR_NAME}},</p>
            
            <p>We hope this message finds you well! We're writing to inform you about some temporary display issues you might notice in your analytics and earnings dashboard this week.</p>
            
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
                <p><strong>IMPORTANT</strong>: Please don't worry! These are purely <strong>display issues</strong> and do <strong>NOT</strong> affect your actual earnings:</p>
                <ul>
                    <li>✅ <strong>All your commissions are completely saved and reserved</strong></li>
                    <li>✅ <strong>Every sale you've generated is securely tracked</strong></li>
                    <li>✅ <strong>Your payment eligibility remains unchanged</strong></li>
                    <li>✅ <strong>No earnings data has been lost or modified</strong></li>
                    <li>✅ <strong>All pending payments are protected</strong></li>
                </ul>
            </div>
            
            <h3>🛠️ What We're Doing</h3>
            <p>Our technical team is working around the clock to:</p>
            <ul>
                <li><strong>Optimize data synchronization</strong> with our affiliate partners</li>
                <li><strong>Improve analytics accuracy</strong> and real-time reporting</li>
                <li><strong>Enhance security measures</strong> to protect your data</li>
                <li><strong>Upgrade performance</strong> for faster dashboard loading</li>
                <li><strong>Strengthen data validation</strong> systems</li>
            </ul>
            
            <h3>⏰ Expected Resolution</h3>
            <p>We expect these display issues to be fully resolved by <strong>Friday, September 6th, 2025</strong>. During this time:</p>
            <ul>
                <li><strong>Continue promoting your links</strong> - all tracking is working normally</li>
                <li><strong>Your commissions are being recorded</strong> accurately behind the scenes</li>
                <li><strong>Payment processing</strong> continues as usual</li>
                <li><strong>Support is available</strong> if you have any concerns</li>
            </ul>
            
            <h3>📞 Need Help?</h3>
            <p>If you have any questions or concerns about your earnings, please don't hesitate to reach out:</p>
            <ul>
                <li><strong>Email</strong>: support@zylike.com</li>
                <li><strong>Dashboard</strong>: Use the "Contact Support" feature</li>
                <li><strong>Response Time</strong>: Within 24 hours</li>
            </ul>
            
            <a href="mailto:support@zylike.com" class="button">Contact Support</a>
            
            <h3>🙏 Thank You for Your Patience</h3>
            <p>We sincerely apologize for any confusion these temporary display issues may cause. Your trust is important to us, and we're committed to providing you with the most accurate and reliable analytics platform possible.</p>
            
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
    </div>
</body>
</html>`;

// 🎯 Function to send email via Mailgun
async function sendMaintenanceEmail(toEmail, creatorName = 'Valued Creator') {
  return new Promise((resolve, reject) => {
    // Validate configuration
    if (MAILGUN_CONFIG.apiKey === 'YOUR_API_KEY_HERE' || MAILGUN_CONFIG.domain === 'YOUR_DOMAIN_HERE') {
      reject(new Error('❌ Please update MAILGUN_CONFIG with your actual API key and domain'));
      return;
    }

    // Prepare email data
    const postData = querystring.stringify({
      from: MAILGUN_CONFIG.fromEmail,
      to: `${creatorName} <${toEmail}>`,
      subject: EMAIL_SUBJECT,
      html: EMAIL_HTML.replace('{{CREATOR_NAME}}', creatorName)
    });

    // Mailgun API options
    const options = {
      hostname: 'api.mailgun.net',
      path: `/v3/${MAILGUN_CONFIG.domain}/messages`,
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('api:' + MAILGUN_CONFIG.apiKey).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log(`📧 Sending maintenance notice to: ${creatorName} <${toEmail}>`);

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Email sent successfully to ${toEmail}`);
          try {
            const response = JSON.parse(data);
            resolve({ success: true, messageId: response.id, email: toEmail });
          } catch (e) {
            resolve({ success: true, email: toEmail });
          }
        } else {
          console.error(`❌ Failed to send email to ${toEmail}. Status: ${res.statusCode}`);
          console.error(`Response: ${data}`);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Request error for ${toEmail}:`, error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 🎯 Function to send to multiple creators with rate limiting
async function sendToAllCreators(creators) {
  console.log(`📬 Starting bulk send to ${creators.length} creators...`);
  
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };

  for (let i = 0; i < creators.length; i++) {
    const creator = creators[i];
    
    try {
      await sendMaintenanceEmail(creator.email, creator.name);
      results.successful++;
      console.log(`✅ Progress: ${i + 1}/${creators.length} - Sent to ${creator.email}`);
    } catch (error) {
      results.failed++;
      results.errors.push({ email: creator.email, error: error.message });
      console.error(`❌ Progress: ${i + 1}/${creators.length} - Failed to send to ${creator.email}: ${error.message}`);
    }

    // Rate limiting: Wait 1 second between emails to respect Mailgun limits
    if (i < creators.length - 1) {
      console.log('⏳ Waiting 1 second (rate limiting)...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n📊 Bulk send complete:`);
  console.log(`✅ Successful: ${results.successful}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Failed emails:`);
    results.errors.forEach(error => {
      console.log(`  - ${error.email}: ${error.error}`);
    });
  }

  return results;
}

// 🧪 Test function - send to yourself first
async function testSend() {
  console.log('🧪 TEST MODE: Sending test email...');
  
  try {
    await sendMaintenanceEmail('your-email@example.com', 'Test User');
    console.log('✅ Test email sent successfully!');
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
  }
}

// 📋 Example creator list (replace with your actual data)
const EXAMPLE_CREATORS = [
  { name: 'John Doe', email: 'john@example.com' },
  { name: 'Jane Smith', email: 'jane@example.com' },
  { name: 'Mike Johnson', email: 'mike@example.com' }
];

// 🚀 Main execution
async function main() {
  console.log('📧 Zylike Creator Maintenance Email Sender');
  console.log('==========================================\n');

  // Check configuration
  if (MAILGUN_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
    console.error('❌ Please update MAILGUN_CONFIG.apiKey with your actual Mailgun API key');
    console.log('💡 Get it from: https://app.mailgun.com → API Keys');
    return;
  }

  if (MAILGUN_CONFIG.domain === 'YOUR_DOMAIN_HERE') {
    console.error('❌ Please update MAILGUN_CONFIG.domain with your actual Mailgun domain');
    console.log('💡 Get it from: https://app.mailgun.com → Domains');
    return;
  }

  // Uncomment the line below to send a test email first
  // await testSend();
  
  // Uncomment the line below to send to all creators
  // await sendToAllCreators(EXAMPLE_CREATORS);
  
  console.log('✅ Ready to send! Uncomment the appropriate function call above.');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { sendMaintenanceEmail, sendToAllCreators, testSend };
