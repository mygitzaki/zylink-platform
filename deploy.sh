#!/bin/bash
# 🚀 Zylink Platform - Fresh Deployment Script

echo "🎉 Welcome to Zylink Platform Fresh Deployment!"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}✅ Your project is clean and ready for fresh deployment!${NC}"
echo ""

echo -e "${YELLOW}=== FRESH DEPLOYMENT STEPS ===${NC}"
echo ""

echo -e "${BLUE}🗑️  STEP 1: Remove Old Deployments${NC}"
echo "   1. Railway: https://railway.app → Delete old project"
echo "   2. Vercel: https://vercel.com → Delete old project"
echo ""

echo -e "${BLUE}🚀 STEP 2: Deploy Backend to Railway${NC}"
echo "   1. Go to: https://railway.app"
echo "   2. Click 'New Project' → 'Deploy from GitHub repo'"
echo "   3. Select: mygitzaki/zylink-platform"
echo "   4. Add PostgreSQL Database: '+ New' → 'Database' → 'PostgreSQL'"
echo "   5. Set Environment Variables:"
echo "      NODE_ENV=production"
echo "      PORT=4000"
echo "      JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters"
echo "      IMPACT_ACCOUNT_SID=IR6HvVENfaTR3908029jXFhKg7EFcPYDe1"
echo "      IMPACT_AUTH_TOKEN=VdKCaAEqjDjKGmwMX3e.-pehMdm3ZiDd"
echo "      IMPACT_PROGRAM_ID=16662"
echo "      IMPACT_MEDIA_PARTNER_ID=3908029"
echo "      IMPACT_API_BASE_URL=https://api.impact.com"
echo "   6. Deploy and copy your Railway URL"
echo ""

echo -e "${BLUE}🌐 STEP 3: Deploy Frontend to Vercel${NC}"
echo "   1. Go to: https://vercel.com"
echo "   2. Click 'New Project' → Import from GitHub"
echo "   3. Select: mygitzaki/zylink-platform"
echo "   4. Configure:"
echo "      - Framework: Vite"
echo "      - Root Directory: frontend"
echo "      - Build Command: npm run build"
echo "      - Output Directory: dist"
echo "   5. Set Environment Variables:"
echo "      VITE_API_URL=https://your-railway-url.railway.app"
echo "      VITE_APP_ENV=production"
echo "   6. Deploy and copy your Vercel URL"
echo ""

echo -e "${BLUE}🔧 STEP 4: Update CORS${NC}"
echo "   After getting Vercel URL, update CORS in backend/server.js"
echo "   Add your Vercel domain to allowed origins"
echo ""

echo -e "${GREEN}🎯 STEP 5: Test Everything${NC}"
echo "   1. Test admin login: realadmin@test.com / adminpass123"
echo "   2. Test creator signup flow"
echo "   3. Test link generation"
echo "   4. Test analytics tracking"
echo ""

echo -e "${YELLOW}=== IMPORTANT NOTES ===${NC}"
echo -e "${RED}⚠️  Remember:${NC}"
echo "   - Replace 'your-railway-url' with actual Railway URL"
echo "   - Update CORS after getting Vercel URL"
echo "   - Run database migrations in Railway dashboard"
echo ""

echo -e "${GREEN}🚀 Ready for fresh deployment!${NC}"
echo "   Your project is clean and all dependencies are installed."
echo "   Follow the steps above for a successful deployment!"
echo ""

echo -e "${BLUE}📚 Need help? Check DEPLOYMENT.md for detailed instructions${NC}"
echo ""
