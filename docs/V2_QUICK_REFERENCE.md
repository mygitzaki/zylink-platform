# Zylike V2 - Quick Reference Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase)
- Impact.com affiliate account
- Railway account (backend hosting)
- Vercel account (frontend hosting)

### Environment Setup
```bash
# Backend
cd backend
npm install
cp .env.example .env
# Configure DATABASE_URL, JWT_SECRET, IMPACT_ACCOUNT_SID, IMPACT_AUTH_TOKEN

# Frontend
cd frontend
npm install
cp .env.example .env
# Configure VITE_API_URL
```

## 📁 Key Files

### Backend
```
backend/src/
├── routes/
│   ├── linksV2.js          # V2 API endpoints
│   ├── admin.js            # Admin functionality
│   └── creator.js          # Creator management
├── services/
│   ├── linkGeneratorV2.js  # Core V2 logic
│   └── impactWebService.js # Impact.com integration
├── utils/
│   └── prisma.js           # Database connection
└── middleware/
    └── auth.js             # Authentication
```

### Frontend
```
frontend/src/
├── pages/admin/
│   └── LinkGeneratorV2.jsx # Main V2 component
├── components/ui/           # Reusable UI components
├── hooks/
│   └── useAuth.js          # Authentication hook
└── lib/
    └── api.js              # API utilities
```

## 🔧 Common Commands

### Development
```bash
# Start backend (if running locally)
cd backend && npm start

# Start frontend (if running locally)
cd frontend && npm run dev

# Database operations
npx prisma migrate dev
npx prisma generate
npx prisma studio
```

### Deployment
```bash
# Deploy changes
git add .
git commit -m "Feature: Description"
git push origin main

# Force deploy (if needed)
git push --force origin main
```

### Database
```bash
# Create V2 tables (if needed)
curl -X POST https://api.zylike.com/api/creator/admin/create-v2-tables

# Reset admin password
curl -X POST https://api.zylike.com/api/admin/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "newPassword": "newpass"}'
```

## 🏷️ Brand Management

### Create Popular Brands
```bash
curl -X POST https://api.zylike.com/api/v2/links/admin/brands/bulk-create
```

### Auto-Discover Brands
```bash
curl -X POST https://api.zylike.com/api/v2/links/admin/brands/discover
```

### List Available Brands
```bash
curl -X GET https://api.zylike.com/api/v2/links/admin/brands
```

## 🔍 Debugging

### Check System Status
```bash
# Check if V2 tables exist
curl -X GET https://api.zylike.com/api/v2/links/debug/database

# Check brand configurations
curl -X GET https://api.zylike.com/api/v2/links/admin/brands

# Check Impact.com programs
curl -X GET https://api.zylike.com/api/v2/links/admin/impact-programs
```

### Common Issues & Solutions

#### Build Failures
- **JSX Syntax Errors**: Check for missing closing tags
- **Duplicate Declarations**: Remove duplicate variable/function declarations
- **Import Errors**: Verify import paths are correct

#### API Errors
- **500 Internal Server Error**: Check database connection and logs
- **401 Unauthorized**: Verify JWT token and authentication
- **404 Not Found**: Check endpoint URLs and routing

#### Brand Detection Issues
- **No Brands Available**: Run brand discovery process
- **Auto-detection Fails**: Check brand configuration and URL format
- **Wrong Brand Detected**: Improve detection logic or manual selection

## 📊 API Endpoints Reference

### V2 Links
- `POST /api/v2/links/generate` - Generate new link
- `GET /api/v2/links` - Get user's links
- `GET /api/v2/links/stats/user` - Get user analytics

### Admin
- `GET /api/v2/links/admin/brands` - List brands
- `POST /api/v2/links/admin/brands` - Create brand
- `POST /api/v2/links/admin/brands/discover` - Auto-discover brands
- `POST /api/admin/reset-password` - Reset admin password

### Utility
- `POST /api/creator/admin/create-v2-tables` - Create V2 tables
- `GET /api/v2/links/debug/database` - Debug database

## 🎨 UI Components

### Main V2 Component
```javascript
// Key state variables
const [brands, setBrands] = useState([]);
const [selectedBrand, setSelectedBrand] = useState(null);
const [generatedLink, setGeneratedLink] = useState(null);

// Key functions
const fetchBrands = async () => { /* Load brands */ };
const handleGenerateLink = async () => { /* Generate link */ };
const createPopularBrands = async () => { /* Create default brands */ };
```

### Brand Selection UI
```javascript
<select value={selectedBrand?.id || 'auto'}>
  <option value="auto">🤖 Auto-detect from URL</option>
  {availableBrands.map(brand => (
    <option key={brand.id} value={brand.id}>
      {brand.displayName}
    </option>
  ))}
</select>
```

## 🔐 Authentication

### Admin Credentials
- **Email**: `superadmin@zylike.com`
- **Password**: `admin123`
- **Role**: `SUPER_ADMIN`

### Token Usage
```javascript
// Include token in API calls
const response = await apiFetch('/api/v2/links/generate', {
  method: 'POST',
  body: JSON.stringify(data),
  token: userToken
});
```

## 📈 Performance Tips

### Database
- Use indexes on frequently queried columns
- Implement connection pooling
- Cache frequently accessed data

### API
- Implement request caching
- Use pagination for large datasets
- Add rate limiting

### Frontend
- Lazy load components
- Implement virtual scrolling for large lists
- Use React.memo for expensive components

## 🚨 Emergency Procedures

### System Down
1. Check deployment status on Vercel/Railway
2. Review error logs
3. Rollback to last working version if needed

### Database Issues
1. Check Supabase connection
2. Verify environment variables
3. Run database health check

### API Failures
1. Check Impact.com API status
2. Verify API credentials
3. Implement fallback mechanisms

## 📞 Support Contacts

- **Development Team**: [Contact Info]
- **Infrastructure**: Railway/Vercel support
- **Database**: Supabase support
- **Affiliate Network**: Impact.com support

---

*This quick reference guide provides essential information for working with the Zylike V2 system. For detailed information, refer to the full development guide.*
