# 🚀 Zylink Platform Production Deployment

## Deployment Setup

### 1. Railway Backend Deployment

#### Required Environment Variables:
```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secure-jwt-secret-here-minimum-32-chars
IMPACT_ACCOUNT_SID=IR6HvVENfaTR3908029jXFhKg7EFcPYDe1
IMPACT_AUTH_TOKEN=VdKCaAEqjDjKGmwMX3e.-pehMdm3ZiDd
IMPACT_PROGRAM_ID=16662
IMPACT_MEDIA_PARTNER_ID=3908029
IMPACT_API_BASE_URL=https://api.impact.com
```

#### Deployment Steps:
1. Connect GitHub repository to Railway
2. Add PostgreSQL database service
3. Set environment variables in Railway dashboard
4. Deploy backend service
5. Run database migrations: `npm run deploy`

### 2. Vercel Frontend Deployment

#### Required Environment Variables:
```
VITE_API_URL=https://your-railway-backend.railway.app
VITE_APP_ENV=production
```

#### Deployment Steps:
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Configure build settings: Build Command = `npm run build`, Output Directory = `dist`
4. Deploy frontend

### 3. Domain Configuration
- Point custom domain to Vercel frontend
- Update CORS settings in backend for production domain

## Post-Deployment Checklist
- [ ] Test creator signup and application flow
- [ ] Test admin approval process
- [ ] Test link generation with Impact.com API
- [ ] Test analytics and tracking
- [ ] Verify HTTPS and security headers
- [ ] Test payment setup workflows

## Admin Account
Use these credentials to access admin dashboard:
- Email: realadmin@test.com
- Password: adminpass123
