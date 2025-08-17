#!/bin/bash
# Zylink Platform Deployment Script

echo "🚀 Starting Zylink Platform Deployment Process..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Repository: https://github.com/mygitzaki/zylink-platform${NC}"
echo ""

echo -e "${YELLOW}=== DEPLOYMENT STEPS ===${NC}"
echo ""

echo -e "${GREEN}✅ Step 1: Code pushed to GitHub${NC}"
echo "   Repository URL: https://github.com/mygitzaki/zylink-platform"
echo ""

echo -e "${BLUE}📝 Step 2: Deploy Backend to Railway${NC}"
echo "   1. Go to: https://railway.app"
echo "   2. Click 'New Project' → 'Deploy from GitHub repo'"
echo "   3. Select: mygitzaki/zylink-platform"
echo "   4. Railway will automatically detect the backend"
echo ""
echo "   Environment Variables to set in Railway:"
echo "   ----------------------------------------"
echo "   NODE_ENV=production"
echo "   PORT=4000"
echo "   JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters-long"
echo "   IMPACT_ACCOUNT_SID=IR6HvVENfaTR3908029jXFhKg7EFcPYDe1"
echo "   IMPACT_AUTH_TOKEN=VdKCaAEqjDjKGmwMX3e.-pehMdm3ZiDd"
echo "   IMPACT_PROGRAM_ID=16662"
echo "   IMPACT_MEDIA_PARTNER_ID=3908029"
echo "   IMPACT_API_BASE_URL=https://api.impact.com"
echo ""
echo "   5. Add PostgreSQL Database:"
echo "      - Click '+ New' → 'Database' → 'PostgreSQL'"
echo "      - Railway will automatically set DATABASE_URL"
echo ""
echo "   6. Deploy and get your Railway URL (e.g., https://zylink-backend-xxxx.railway.app)"
echo ""

echo -e "${BLUE}📝 Step 3: Deploy Frontend to Vercel${NC}"
echo "   1. Go to: https://vercel.com"
echo "   2. Click 'New Project' → Import from GitHub"
echo "   3. Select: mygitzaki/zylink-platform"
echo "   4. Configure build settings:"
echo "      - Framework Preset: Vite"
echo "      - Root Directory: frontend"
echo "      - Build Command: npm run build"
echo "      - Output Directory: dist"
echo ""
echo "   Environment Variables to set in Vercel:"
echo "   ---------------------------------------"
echo "   VITE_API_URL=https://your-railway-backend-url.railway.app"
echo ""
echo "   5. Deploy and get your Vercel URL (e.g., https://zylink-platform.vercel.app)"
echo ""

echo -e "${GREEN}🎯 Step 4: Test Production Deployment${NC}"
echo "   1. Visit your Vercel frontend URL"
echo "   2. Test admin login: realadmin@test.com / adminpass123"
echo "   3. Test creator signup and application flow"
echo "   4. Test link generation and analytics"
echo ""

echo -e "${YELLOW}=== IMPORTANT NOTES ===${NC}"
echo -e "${RED}⚠️  After Railway deployment:${NC}"
echo "   - Run database migration: Go to Railway dashboard → Your service → Click 'Deploy'"
echo "   - Or manually run: npm run deploy (this runs Prisma migrations)"
echo ""
echo -e "${RED}⚠️  Update CORS in backend after getting Vercel URL:${NC}"
echo "   - Add your Vercel domain to CORS origins in backend/server.js"
echo ""

echo -e "${GREEN}🚀 Ready for deployment!${NC}"
echo "   Your GitHub repository is set up at: https://github.com/mygitzaki/zylink-platform"
echo ""
