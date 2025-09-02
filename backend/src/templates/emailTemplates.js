// Email Templates for Admin Email Management

const MAINTENANCE_NOTICE_HTML = `<!DOCTYPE html>
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

const GENERAL_ANNOUNCEMENT_HTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📢 Zylike Update</h1>
    </div>
    <div class="content">
        <p>Dear {{CREATOR_NAME}},</p>
        <p>[Your announcement content here]</p>
        <p>Best regards,<br>The Zylike Team</p>
    </div>
    <div class="footer">
        <p>© 2025 Zylike. All rights reserved.</p>
    </div>
</body>
</html>`;

const EMAIL_TEMPLATES = [
  {
    id: 'maintenance_notice',
    name: 'Maintenance Notice',
    subject: '🔧 Important Notice: Temporary Analytics Display Issues (Your Earnings Are Safe!)',
    description: 'Notify creators about temporary analytics issues during maintenance',
    htmlContent: MAINTENANCE_NOTICE_HTML
  },
  {
    id: 'general_announcement',
    name: 'General Announcement',
    subject: '📢 Important Update from Zylike',
    description: 'General announcement template for creators',
    htmlContent: GENERAL_ANNOUNCEMENT_HTML
  }
];

module.exports = { EMAIL_TEMPLATES };
