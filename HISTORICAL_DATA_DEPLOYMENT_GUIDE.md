# Historical Data Mapping - Production Deployment Guide

## 🎯 Overview

This guide covers the safe deployment of historical data mapping for each creator using the Impact.com API. The system will automatically map historical data and maintain ongoing daily updates.

## 🏗️ Architecture

### Components Added:
1. **HistoricalDataMigration Service** - Production-safe data mapping with batching and error handling
2. **Enhanced Admin Dashboard** - New migration controls and status monitoring
3. **Automated Daily Sync** - Cron-based daily data collection (already implemented)
4. **Production Safety Features** - Rate limiting, backups, error handling

### Database Tables Used:
- `DailyAnalytics` - Primary historical data storage
- `EarningsSnapshot` - Point-in-time earnings backup
- `EarningsReversal` - Commission reversal tracking

## 🚀 Deployment Steps

### 1. Pre-Deployment Verification

```bash
# Verify Impact.com API credentials are set
echo "IMPACT_ACCOUNT_SID: $IMPACT_ACCOUNT_SID"
echo "IMPACT_AUTH_TOKEN: $IMPACT_AUTH_TOKEN"
echo "IMPACT_PROGRAM_ID: $IMPACT_PROGRAM_ID"

# Test database connection
npm run test:db

# Check active creators count
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Creator\" WHERE \"isActive\" = true AND \"applicationStatus\" = 'APPROVED';"
```

### 2. Deploy Backend Changes

The following files have been added/modified:
- ✅ `backend/src/services/historicalDataMigration.js` (NEW)
- ✅ `backend/src/routes/admin.js` (UPDATED - new endpoints)
- ✅ `frontend/src/pages/admin/HistoricalAnalytics.jsx` (UPDATED - new UI)

```bash
# Deploy backend
cd backend
npm install
npm run build # if applicable
pm2 restart backend # or your deployment method

# Deploy frontend
cd ../frontend
npm install
npm run build
# Deploy to your hosting service (Vercel, etc.)
```

### 3. Environment Variables

Ensure these are set in production:

```bash
# Required for historical data mapping
IMPACT_ACCOUNT_SID=IR6HvVENfaTR3908029jXFhKg7EFcPYDe1
IMPACT_AUTH_TOKEN=VdKCaAEqjDjKGmwMX3e.-pehMdm3ZiDd
IMPACT_PROGRAM_ID=16662
IMPACT_MEDIA_PARTNER_ID=3908029
IMPACT_API_BASE_URL=https://api.impact.com

# Cron service (enable daily automation)
ENABLE_CRON_JOBS=true
NODE_ENV=production

# Database
DATABASE_URL=your_production_database_url
```

## 📊 Using the Historical Data Mapping

### Step 1: Initial Historical Data Mapping

1. **Access Admin Dashboard**
   - Go to `/admin` → "Historical Analytics"
   - You'll see the new "Historical Data Status" section

2. **Choose Migration Method**

   **Option A: Full Historical Mapping (Recommended)**
   - Click "🗺️ Map All Historical Data" 
   - Maps 90 days of data for all creators
   - Runs automatically in background
   - Safe for production

   **Option B: Custom Range Migration**
   - Set custom date range
   - Choose specific creators (optional)
   - Click "🔍 Preview Migration (Dry Run)" to test first
   - Click "🚀 Live Migration" to execute

### Step 2: Monitor Progress

- Check "Historical Data Status" section for real-time stats
- View "Recent Data Sync Activity" for latest updates
- Monitor server logs for detailed progress

### Step 3: Ongoing Automation

Once initial mapping is complete:
- ✅ **Daily Sync**: Automatically runs at 2 AM daily
- ✅ **Gap Filling**: Automatically fills any missing dates
- ✅ **Error Recovery**: Continues processing even if some creators fail

## 🔒 Production Safety Features

### Rate Limiting & Batching
- Processes 5 creators at a time
- 2-second delays between batches
- 0.5-second delays between creators
- Respects Impact.com API limits

### Error Handling
- Continues processing if individual creators fail
- Comprehensive error logging
- Graceful fallbacks to database data
- No data corruption risks

### Data Protection
- Creates backups before major operations
- Uses upsert operations (safe updates)
- Point-in-time snapshots for historical protection
- Forward-only commission rate changes

### Monitoring & Alerts
- Real-time status monitoring
- Detailed progress reporting
- Error aggregation and reporting
- Performance metrics tracking

## 🛠️ API Endpoints Added

### Historical Migration
```bash
# Start migration
POST /api/admin/historical-migration/start
{
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "specificCreatorIds": null, // or ["creator-id-1", "creator-id-2"]
  "dryRun": false,
  "continueOnError": true
}

# Get migration status
GET /api/admin/historical-migration/status
```

### Existing Analytics (Enhanced)
```bash
# Get historical analytics (existing, enhanced)
GET /api/admin/analytics/historical?dateRange=1m&creatorId=optional

# Trigger daily collection (existing)
POST /api/admin/analytics/collect-daily

# Backfill date range (existing)
POST /api/admin/analytics/backfill
```

## 📈 Expected Results

### After Initial Migration:
- **Historical Data Coverage**: 90 days of data for all active creators
- **Daily Metrics**: Sales, commissions, clicks, conversions per creator per day
- **Data Sources**: Mix of Impact.com API and database fallbacks
- **Update Frequency**: Daily at 2 AM automatically

### Performance Expectations:
- **Initial Migration**: ~2 minutes per creator for 90 days
- **Daily Updates**: ~30 seconds for all creators
- **API Calls**: ~100-200 per day (well within Impact.com limits)
- **Storage**: ~1MB per creator per year

## 🚨 Troubleshooting

### Common Issues:

1. **Migration Fails to Start**
   ```bash
   # Check Impact.com API credentials
   curl -u "$IMPACT_ACCOUNT_SID:$IMPACT_AUTH_TOKEN" \
        "https://api.impact.com/Mediapartners/$IMPACT_ACCOUNT_SID"
   ```

2. **Some Creators Have No Data**
   - Check if creator has `impactSubId` set
   - Verify creator is active and approved
   - Check Impact.com for actual activity

3. **Daily Sync Not Running**
   ```bash
   # Check cron service status
   curl -H "Authorization: Bearer $ADMIN_TOKEN" \
        "https://your-api.com/api/admin/cron/status"
   
   # Manually trigger daily job
   curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
        "https://your-api.com/api/admin/analytics/collect-daily"
   ```

4. **Performance Issues**
   - Check database indexes on `DailyAnalytics.creatorId` and `DailyAnalytics.date`
   - Monitor Impact.com API response times
   - Consider reducing batch sizes in production

## 📋 Post-Deployment Checklist

- [ ] Historical data migration completed successfully
- [ ] All active creators have data for recent dates
- [ ] Daily cron job is running (check at 2 AM next day)
- [ ] Admin dashboard shows accurate statistics
- [ ] No errors in application logs
- [ ] Impact.com API calls are within limits
- [ ] Database performance is acceptable
- [ ] Backup systems are working

## 🔄 Maintenance

### Weekly:
- Check migration status for any failed creators
- Monitor Impact.com API usage
- Review error logs

### Monthly:
- Analyze historical data accuracy
- Check for any missing date ranges
- Performance optimization if needed

### Quarterly:
- Review and optimize database queries
- Consider archiving very old data
- Update documentation as needed

---

## 🎉 Success Metrics

After successful deployment, you should see:

1. **Complete Historical Coverage**: Every active creator has daily data going back 90 days
2. **Automated Updates**: New data appears daily without manual intervention  
3. **Admin Visibility**: Rich dashboard showing creator performance over time
4. **Production Stability**: System runs reliably with proper error handling
5. **Impact API Integration**: Real commission and sales data from Impact.com

The system is now production-ready and will automatically maintain historical data for all creators while providing comprehensive analytics in the admin dashboard.
