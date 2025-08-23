# 🚀 Zylink Production Setup Guide

## 🎯 **Phase 1: Domain & DNS Setup**

### **1.1 Purchase Domain**
- **Recommended**: `zylike.com` (or similar)
- **Registrar Options**:
  - **Namecheap**: ~$10-15/year
  - **GoDaddy**: ~$12-20/year
  - **Google Domains**: ~$12/year

### **1.2 DNS Configuration**
After purchasing your domain, configure DNS records:

```
Type    Name    Value
A       @       76.76.19.34
CNAME   www     cname.vercel-dns.com
CNAME   api     zylink-platform-production.up.railway.app
CNAME   s       zylink-platform-production.up.railway.app
```

**Note**: Replace `zylink-platform-production.up.railway.app` with your actual Railway domain if different.

### **1.3 GoDaddy DNS Setup (Step-by-Step)**

#### **Step 1: Access DNS Management**
1. Go to [GoDaddy DNS Management](https://dcc.godaddy.com/control/dnsmanagement)
2. Select your domain `zylike.com`
3. Click "DNS" in the left sidebar

#### **Step 2: Remove Conflicting Records**
1. **Delete** any CNAME record with "@" name
2. **Keep** the A record with "@" name (we'll update it)

#### **Step 3: Update Root Domain**
1. **Click "Edit"** on the existing A record
2. **Change Value** from "Parked" to: `76.76.19.34`
3. **Set TTL** to "1 Hour"
4. **Click "Save"**

#### **Step 4: Add www Subdomain**
1. **Click "Add More Records"**
2. **Type**: CNAME
3. **Name**: www
4. **Value**: `cname.vercel-dns.com`
5. **TTL**: 1 Hour
6. **Click "Add"**

#### **Step 5: Add api Subdomain**
1. **Click "Add More Records"**
2. **Type**: CNAME
3. **Name**: api
4. **Value**: `zylink-platform-production.up.railway.app`
5. **TTL**: 1 Hour
6. **Click "Add"**

#### **Step 6: Add s Subdomain (Short Links)**
1. **Click "Add More Records"**
2. **Type**: CNAME
3. **Name**: s
4. **Value**: `zylink-platform-production.up.railway.app`
5. **TTL**: 1 Hour
6. **Click "Add"**

#### **Step 7: Verify Records**
Your final DNS table should look like this:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 76.76.19.34 | 1 Hour |
| CNAME | www | cname.vercel-dns.com | 1 Hour |
| CNAME | api | zylink-platform-production.up.railway.app | 1 Hour |
| CNAME | s | zylink-platform-production.up.railway.app | 1 Hour |

#### **Step 8: Wait for Propagation**
- DNS changes can take 1-48 hours to propagate globally
- Usually works within 1-2 hours
- Test with: `nslookup api.zylike.com`

## 🎯 **Phase 2: Email Service Setup**

### **2.1 Gmail SMTP (Recommended for Start)**
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App Passwords
   - Generate password for "Mail"
3. **Use these credentials**:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```

### **2.2 Professional Email Service (Recommended for Production)**
**SendGrid** (Free tier: 100 emails/day):
1. Sign up at sendgrid.com
2. Create API key
3. Verify your domain
4. Use SMTP settings from SendGrid dashboard

**Mailgun** (Free tier: 5,000 emails/month):
1. Sign up at mailgun.com
2. Verify your domain
3. Use SMTP settings from Mailgun dashboard

## 🎯 **Phase 3: Railway Backend Configuration**

### **3.1 Environment Variables**
Set these in your Railway backend project:

```bash
# Database (already set)
DATABASE_URL=your-supabase-connection-string

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-super-long-random-secret-key-here

# Short Links
SHORTLINK_BASE=https://zylike.com/s

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@zylike.com
FROM_NAME=Zylike Platform
FRONTEND_URL=https://zylike.com

# CORS Origins
CORS_ORIGIN=https://zylike.com
```

### **3.2 Custom Domain Setup**
1. **In Railway Dashboard**:
   - Go to your backend project
   - Settings → Domains
   - Add custom domain: `api.zylike.com`
2. **Update DNS**:
   ```
   Type    Name    Value
   CNAME   api     [Railway-provided-domain]
   ```

## 🎯 **Phase 4: Vercel Frontend Configuration**

### **4.1 Custom Domain**
1. **In Vercel Dashboard**:
   - Go to your frontend project
   - Settings → Domains
   - Add: `zylike.com` and `www.zylike.com`
2. **Update DNS**:
   ```
   Type    Name    Value
   CNAME   @       cname.vercel-dns.com
   CNAME   www     cname.vercel-dns.com
   ```

### **4.2 Environment Variables**
Set these in Vercel:

```bash
VITE_API_URL=https://api.zylike.com
NODE_ENV=production
```

## 🎯 **Phase 5: Database Security & Backup**

### **5.1 Supabase Security**
1. **Row Level Security (RLS)**:
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE "Creator" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "Link" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "ShortLink" ENABLE ROW LEVEL SECURITY;
   ```

2. **Backup Strategy**:
   - **Daily**: Automated Supabase backups
   - **Weekly**: Manual export to secure location
   - **Monthly**: Full database dump

### **5.2 Data Protection**
1. **Encrypt sensitive data** (passwords already hashed with bcrypt)
2. **Regular security audits**
3. **Monitor for suspicious activity**

## 🎯 **Phase 6: SSL & Security**

### **6.1 SSL Certificates**
- **Railway**: Automatic SSL
- **Vercel**: Automatic SSL
- **Custom Domain**: Automatic via Vercel/Railway

### **6.2 Security Headers**
Add to your backend:

```javascript
// In server.js
app.use(helmet()); // Security headers
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

## 🎯 **Phase 7: Monitoring & Analytics**

### **7.1 Application Monitoring**
- **Railway**: Built-in monitoring
- **Vercel**: Built-in analytics
- **External**: Consider Sentry for error tracking

### **7.2 Performance Monitoring**
- **Database**: Monitor query performance
- **API**: Track response times
- **Frontend**: Core Web Vitals

## 🎯 **Phase 8: Legal & Compliance**

### **8.1 Terms of Service**
Create comprehensive ToS covering:
- User responsibilities
- Payment terms
- Data usage
- Dispute resolution

### **8.2 Privacy Policy**
Cover:
- Data collection
- Data usage
- User rights (GDPR compliance)
- Contact information

### **8.3 Affiliate Disclosure**
Ensure compliance with:
- FTC guidelines
- Platform-specific rules
- Local regulations

## 🎯 **Phase 9: Payment & Payout Security**

### **9.1 Payment Processing**
- **Stripe**: Recommended for payments
- **PayPal**: Alternative option
- **Crypto**: Consider for international users

### **9.2 Payout Security**
- **Multi-factor authentication** for large payouts
- **Manual review** for suspicious transactions
- **Fraud detection** systems

## 🎯 **Phase 10: Launch Checklist**

### **10.1 Pre-Launch**
- [ ] Domain configured and SSL working
- [ ] Email service tested
- [ ] Database backed up
- [ ] Security audit completed
- [ ] Legal documents ready
- [ ] Payment system tested
- [ ] Error monitoring active

### **10.2 Launch Day**
- [ ] Monitor system performance
- [ ] Watch for error rates
- [ ] Test user registration flow
- [ ] Verify email delivery
- [ ] Check payment processing

### **10.3 Post-Launch**
- [ ] Monitor user feedback
- [ ] Track performance metrics
- [ ] Plan scaling strategy
- [ ] Regular security updates

## 🔒 **Security Best Practices**

### **Data Protection**
1. **Never log sensitive data**
2. **Use environment variables** for secrets
3. **Regular security updates**
4. **Monitor access logs**

### **User Privacy**
1. **Minimize data collection**
2. **Clear data retention policies**
3. **User consent for marketing**
4. **Easy data deletion**

## 💰 **Cost Estimation (Monthly)**

### **Domain & SSL**
- Domain: $1-2/month
- SSL: Free (Let's Encrypt)

### **Hosting**
- Railway Backend: $5-20/month
- Vercel Frontend: Free tier
- Supabase Database: Free tier (up to 500MB)

### **Email Service**
- SendGrid: Free (100 emails/day)
- Mailgun: Free (5,000 emails/month)
  - Create domain in Mailgun and add DNS (TXT, MX, CNAME). Verify domain.
  - In Railway backend service, add env vars:
    - `MAILGUN_SMTP_LOGIN` and `MAILGUN_SMTP_PASSWORD` (from Mailgun domain settings)
    - `MAILGUN_FROM` (e.g., noreply@yourdomain.com)
    - Optional: `SMTP_HOST=smtp.mailgun.org`, `SMTP_PORT=587`, `SMTP_SECURE=false`
  - Our backend will auto-detect these and send via SMTP. Test with:
    - POST `/api/admin/test-email` (Authorization: Admin) body:
      `{ "to": "you@yourdomain.com", "subject": "Test", "text": "Hello" }`
  - Note: Sandbox domains only send to authorized recipients.

### **Total Estimated**: $6-25/month

## 🚀 **Scaling Strategy**

### **Phase 1: MVP (0-100 users)**
- Current setup sufficient
- Monitor performance

### **Phase 2: Growth (100-1000 users)**
- Upgrade database plan
- Add CDN for static assets
- Implement caching

### **Phase 3: Scale (1000+ users)**
- Consider dedicated hosting
- Load balancing
- Microservices architecture

## 📞 **Support & Maintenance**

### **24/7 Monitoring**
- Set up alerts for downtime
- Monitor error rates
- Track user experience metrics

### **Regular Updates**
- Security patches
- Feature updates
- Performance optimizations

### **User Support**
- Help desk system
- Documentation
- Video tutorials

---

## 🎯 **Next Steps**

1. **Purchase domain** (zylike.com)
2. **Set up email service** (Gmail SMTP to start)
3. **Configure DNS records**
4. **Update Railway environment variables**
5. **Set up Vercel custom domain**
6. **Test email functionality**
7. **Deploy and test**
8. **Launch marketing campaign**

---

**Remember**: Start small, test thoroughly, and scale gradually. Your platform's success depends on reliability and user trust! 🚀
