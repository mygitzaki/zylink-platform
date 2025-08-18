# 🚀 Zylink Platform - Fresh Deployment Guide

## ✨ Fresh Start - Clean Deployment

This guide will help you deploy your Zylink Platform with a clean, error-free setup.

## 🗑️ Step 1: Clean Previous Deployments

### Remove from Railway:
1. Go to [railway.app](https://railway.app)
2. Find your Zylink project → Delete Project
3. Confirm deletion

### Remove from Vercel:
1. Go to [vercel.com](https://vercel.com)
2. Find your Zylink project → Delete Project
3. Confirm deletion

## 🚀 Step 2: Deploy Backend to Railway

### 2.1 Create New Railway Project
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select: `mygitzaki/zylink-platform`
4. Railway will auto-detect the backend

### 2.2 Add PostgreSQL Database
1. Click "+ New" → "Database" → "PostgreSQL"
2. Railway will automatically set `DATABASE_URL`

### 2.3 Set Environment Variables
Add these in Railway dashboard → Variables:

```env
NODE_ENV=production
PORT=4000
JWT_SECRET=your-super-secure-jwt-secret-here-minimum-32-characters
IMPACT_ACCOUNT_SID=IR6HvVENfaTR3908029jXFhKg7EFcPYDe1
IMPACT_AUTH_TOKEN=VdKCaAEqjDjKGmwMX3e.-pehMdm3ZiDd
IMPACT_PROGRAM_ID=16662
IMPACT_MEDIA_PARTNER_ID=3908029
IMPACT_API_BASE_URL=https://api.impact.com
```

### 2.4 Deploy Backend
1. Click "Deploy" in Railway
2. Wait for deployment to complete
3. Copy your Railway URL (e.g., `https://zylink-backend-xxxx.railway.app`)

### 2.5 Run Database Migrations
1. Go to Railway dashboard → Your service
2. Click "Deploy" again (this runs Prisma migrations)
3. Or manually run: `npm run deploy`

## 🌐 Step 3: Deploy Frontend to Vercel

### 3.1 Create New Vercel Project
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project" → Import from GitHub
3. Select: `mygitzaki/zylink-platform`

### 3.2 Configure Build Settings
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 3.3 Set Environment Variables
Add in Vercel dashboard → Environment Variables:

```env
VITE_API_URL=https://your-railway-backend-url.railway.app
VITE_APP_ENV=production
```

**⚠️ IMPORTANT**: Replace `your-railway-backend-url` with your actual Railway URL from Step 2.4

### 3.4 Deploy Frontend
1. Click "Deploy"
2. Wait for deployment to complete
3. Copy your Vercel URL (e.g., `https://zylink-platform.vercel.app`)

## 🔧 Step 4: Update CORS Settings

After getting your Vercel URL, update the backend CORS:

1. Go to Railway dashboard → Your service → Deployments
2. Click on the latest deployment → "View Logs"
3. Add your Vercel domain to CORS origins in `backend/server.js`

## ✅ Step 5: Test Everything

### Test Admin Access:
- **Email**: `realadmin@test.com`
- **Password**: `adminpass123`

### Test Features:
- [ ] Creator signup and application flow
- [ ] Admin approval process
- [ ] Link generation with Impact.com API
- [ ] Analytics and tracking
- [ ] Payment setup workflows

## 🎯 Success Checklist

- [ ] Backend deployed on Railway ✅
- [ ] Frontend deployed on Vercel ✅
- [ ] Database migrations completed ✅
- [ ] CORS configured correctly ✅
- [ ] All features tested ✅
- [ ] No deployment errors ✅

## 🆘 Troubleshooting

### Common Issues:
1. **Build fails**: Check if all dependencies are installed
2. **Database connection**: Verify `DATABASE_URL` in Railway
3. **CORS errors**: Update CORS origins with your Vercel domain
4. **Environment variables**: Ensure all required vars are set

### Need Help?
- Check Railway logs for backend issues
- Check Vercel build logs for frontend issues
- Verify all environment variables are set correctly

---

**🎉 Congratulations! You now have a clean, fresh deployment of your Zylink Platform!**
