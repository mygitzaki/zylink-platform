# Database Setup Guide - Resolving IPv4 Compatibility Issues

## 🚨 Problem Identified

Your Supabase database connection is failing because of **IPv4 compatibility issues**. The "Direct connection" method shows "Not IPv4 compatible" which prevents your application from connecting.

## ✅ Solution: Use Transaction Pooler

The **Transaction Pooler** connection method is IPv4 compatible and will resolve your connection issues.

## 📋 Step-by-Step Setup

### 1. Get Your Connection Strings from Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Copy the **Transaction Pooler** connection string (NOT the Direct connection)

### 2. Create Your Environment File

Create a `.env` file in the `backend/` directory with this content:

```bash
# Database Configuration - USE TRANSACTION POOLER (IPv4 Compatible)
DATABASE_URL="postgresql://postgres.hzsyuqsfksuhqvfquufm:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20"

# Direct connection (for migrations only - requires IPv4 add-on)
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.hzsyuqsfksuhqvfquufm.supabase.co:5432/postgres"

# Environment
NODE_ENV=development

# JWT Secret for authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Server Configuration
PORT=4000

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### 3. Important Notes

- **Use port 6543** (Transaction Pooler) for your main connection
- **Avoid port 5432** (Direct connection) unless you have IPv4 add-on
- Replace `[YOUR-PASSWORD]` with your actual Supabase database password

### 4. Test Your Connection

Run the setup script to test your database connection:

```bash
cd backend
node setup-database.js
```

Or test directly:

```bash
node test-db.js
```

### 5. Start Your Application

Once the connection is successful:

```bash
npm start
```

## 🔧 Troubleshooting

### Connection Still Failing?

1. **Verify you're using Transaction Pooler connection string**
2. **Check your password is correct**
3. **Ensure your IP is allowed in Supabase dashboard**
4. **Confirm you're using port 6543, not 5432**

### Common Error Messages

- `ECONNREFUSED`: Wrong port or host
- `ENOTFOUND`: Invalid hostname
- `password authentication failed`: Wrong password
- `IPv4 not compatible`: Using direct connection instead of pooler

## 📚 Connection String Breakdown

Your Transaction Pooler connection string:
```
postgresql://postgres.hzsyuqsfksuhqvfquufm:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20
```

- **Protocol**: `postgresql://`
- **User**: `postgres.hzsyuqsfksuhqvfquufm`
- **Password**: `[YOUR-PASSWORD]`
- **Host**: `aws-0-us-west-1.pooler.supabase.com`
- **Port**: `6543` (Transaction Pooler)
- **Database**: `postgres`
- **Parameters**: Connection pooling settings

## 🎯 Why This Fixes Your Issue

1. **IPv4 Compatibility**: Transaction Pooler is IPv4 compatible
2. **Connection Pooling**: Better performance and reliability
3. **No Additional Costs**: Free with your Supabase plan
4. **Production Ready**: Suitable for production applications

## 🚀 Next Steps

After successful connection:
1. Run database migrations: `npm run prisma:push`
2. Generate Prisma client: `npm run prisma:generate`
3. Start your application: `npm start`

Your database connection issues should now be completely resolved! 🎉



