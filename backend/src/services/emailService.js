class EmailService {
  constructor() {
    this.apiKey = process.env.MAILGUN_API_KEY;
    this.domain = process.env.MAILGUN_DOMAIN || 'mg.zylike.com';
    this.fromEmail = process.env.MAILGUN_FROM || process.env.FROM_EMAIL || 'noreply@mg.zylike.com';
    this.fromName = process.env.FROM_NAME || 'Zylike Platform';
    this.apiUrl = `https://api.mailgun.net/v3/${this.domain}/messages`;
  }

  async initialize() {
    try {
      if (!this.apiKey || !this.domain) {
        console.warn('⚠️ Mailgun API not fully configured. Email service will run in simulation mode.');
        console.warn('Missing:', !this.apiKey ? 'MAILGUN_API_KEY' : '', !this.domain ? 'MAILGUN_DOMAIN' : '');
        return;
      }

      console.log('✅ Mailgun HTTP API service initialized successfully');
      console.log(`📧 Using domain: ${this.domain}`);
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
    }
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      if (!this.apiKey || !this.domain) {
        console.log('📧 [EMAIL SIMULATION] To:', to);
        console.log('📧 [EMAIL SIMULATION] Subject:', subject);
        console.log('📧 [EMAIL SIMULATION] Content:', htmlContent);
        return { success: true, message: 'Email simulated (Mailgun API not configured)' };
      }

      // Prepare form data for Mailgun API
      const formData = new URLSearchParams();
      formData.append('from', `${this.fromName} <${this.fromEmail}>`);
      formData.append('to', to);
      formData.append('subject', subject);
      formData.append('html', htmlContent);
      if (textContent) {
        formData.append('text', textContent);
      } else {
        formData.append('text', this.stripHtml(htmlContent));
      }

      // Send via Mailgun HTTP API
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mailgun API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Email sent successfully via Mailgun API to:', to);
      console.log('📧 Message ID:', result.id);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  // Welcome email for new creators
  async sendWelcomeEmail(creator) {
    const subject = 'Welcome to Zylike! 🎉';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 32px;">Welcome to Zylike!</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your creator journey starts now</p>
        </div>
        
        <div style="padding: 40px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${creator.name}! 👋</h2>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Welcome to Zylike, the ultimate platform for creators to monetize their audience and maximize earnings!
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin: 0 0 15px 0;">What's Next?</h3>
            <ul style="color: #555; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Complete your profile and bio</li>
              <li>Start generating affiliate links</li>
              <li>Track your performance with analytics</li>
              <li>Earn commissions from every sale</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://zylike.com'}/dashboard" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
              Get Started Now
            </a>
          </div>
          
          <p style="color: #777; font-size: 14px; margin-top: 30px;">
            If you have any questions, feel free to reach out to our support team.
          </p>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center; color: white;">
          <p style="margin: 0; font-size: 14px;">© 2025 Zylike. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail(creator.email, subject, htmlContent);
  }

  // Application status update email
  async sendApplicationStatusEmail(creator, status, notes = null) {
    const statusEmojis = {
      'APPROVED': '✅',
      'REJECTED': '❌',
      'UNDER_REVIEW': '⏳',
      'CHANGES_REQUESTED': '📝'
    };

    const statusMessages = {
      'APPROVED': 'Your application has been approved!',
      'REJECTED': 'Your application requires attention',
      'UNDER_REVIEW': 'Your application is under review',
      'CHANGES_REQUESTED': 'Changes requested for your application'
    };

    const subject = `${statusEmojis[status]} ${statusMessages[status]}`;
    
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 32px;">${statusEmojis[status]} Application Update</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">${statusMessages[status]}</p>
        </div>
        
        <div style="padding: 40px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${creator.name}! 👋</h2>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            We have an update regarding your Zylike creator application.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Status: ${status.replace('_', ' ')}</h3>
            ${notes ? `<p style="color: #555; line-height: 1.6; margin: 0;"><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>
    `;

    if (status === 'APPROVED') {
      htmlContent += `
            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #155724; margin: 0 0 15px 0;">🎉 You're Approved!</h3>
              <p style="color: #155724; margin: 0; line-height: 1.6;">
                Congratulations! You can now start creating affiliate links and earning commissions. 
                Your account is fully activated and ready to go.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://zylike.com'}/dashboard" 
                 style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
                Start Creating Links
              </a>
            </div>
      `;
    } else if (status === 'REJECTED') {
      htmlContent += `
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #721c24; margin: 0 0 15px 0;">📋 Application Review</h3>
              <p style="color: #721c24; margin: 0; line-height: 1.6;">
                We've reviewed your application and found some areas that need attention. 
                Please review the feedback and consider reapplying with the suggested improvements.
              </p>
            </div>
      `;
    } else if (status === 'CHANGES_REQUESTED') {
      htmlContent += `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #856404; margin: 0 0 15px 0;">📝 Changes Requested</h3>
              <p style="color: #856404; margin: 0; line-height: 1.6;">
                We'd like to see some changes to your application before approval. 
                Please review the feedback and update your application accordingly.
              </p>
            </div>
      `;
    }

    htmlContent += `
          <p style="color: #777; font-size: 14px; margin-top: 30px;">
            If you have any questions, please don't hesitate to contact our support team.
          </p>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center; color: white;">
          <p style="margin: 0; font-size: 14px;">© 2025 Zylike. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail(creator.email, subject, htmlContent);
  }

  // Password reset email
  async sendPasswordResetEmail(creator, resetToken) {
    const subject = 'Reset Your Zylike Password 🔐';
    const resetUrl = `${process.env.FRONTEND_URL || 'https://zylike.com'}/reset-password?token=${resetToken}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 32px;">Password Reset Request</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Secure your account</p>
        </div>
        
        <div style="padding: 40px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${creator.name}! 👋</h2>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            We received a request to reset your Zylike account password. If you didn't make this request, 
            you can safely ignore this email.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Reset Your Password</h3>
            <p style="color: #555; line-height: 1.6; margin: 0;">
              Click the button below to create a new password for your account. 
              This link will expire in 1 hour for security reasons.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #777; font-size: 14px; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #667eea;">${resetUrl}</a>
          </p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>Security Note:</strong> Never share this link with anyone. Our team will never ask for your password.
            </p>
          </div>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center; color: white;">
          <p style="margin: 0; font-size: 14px;">© 2025 Zylike. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail(creator.email, subject, htmlContent);
  }

  // Payment notification email
  async sendPaymentNotificationEmail(creator, amount, paymentMethod) {
    const subject = 'Payment Received! 💰';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 32px;">Payment Received!</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your earnings are on the way</p>
        </div>
        
        <div style="padding: 40px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${creator.name}! 👋</h2>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Great news! We've processed your payment request and the funds are on their way to you.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Payment Details</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #555;">Amount:</span>
              <span style="color: #333; font-weight: bold;">$${amount.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #555;">Payment Method:</span>
              <span style="color: #333; font-weight: bold;">${paymentMethod}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #555;">Status:</span>
              <span style="color: #28a745; font-weight: bold;">✅ Processed</span>
            </div>
          </div>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            The funds should appear in your account within 3-5 business days, depending on your payment method.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://zylike.com'}/dashboard" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
              View Dashboard
            </a>
          </div>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center; color: white;">
          <p style="margin: 0; font-size: 14px;">© 2025 Zylike. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail(creator.email, subject, htmlContent);
  }
}

module.exports = { EmailService };
