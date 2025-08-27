#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { checkDatabaseHealth } = require('./src/config/database');

console.log('🚀 Zylink Platform Database Setup');
console.log('=====================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('❌ No .env file found!');
  console.log('\n📝 Please create a .env file with the following content:');
  console.log('\n# Copy from env.example and update with your Supabase credentials');
  console.log('DATABASE_URL="postgresql://postgres.hzsyuqsfksuhqvfquufm:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20"');
  console.log('DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.hzsyuqsfksuhqvfquufm.supabase.co:5432/postgres"');
  console.log('NODE_ENV=development');
  console.log('JWT_SECRET=your-super-secret-jwt-key-here');
  console.log('PORT=3001');
  console.log('CORS_ORIGIN=http://localhost:5173');
  
  console.log('\n💡 Important: Use the Transaction Pooler connection (port 6543) for IPv4 compatibility!');
  console.log('💡 The Direct connection (port 5432) requires IPv4 add-on from Supabase.');
  
  process.exit(1);
}

console.log('✅ .env file found');

// Load environment variables
require('dotenv').config();

// Check required environment variables
const requiredEnvVars = ['DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

console.log('✅ Environment variables loaded');

// Test database connection
console.log('\n🔍 Testing database connection...');

checkDatabaseHealth()
  .then(health => {
    if (health.status === 'healthy') {
      console.log('✅ Database connection successful!');
      console.log('💡 Your database is now properly configured with IPv4 compatibility.');
      console.log('\n🚀 You can now run your application with:');
      console.log('   npm start');
      console.log('\n🔧 To test the connection again, run:');
      console.log('   node test-db.js');
    } else {
      console.log('❌ Database connection failed:', health.message);
      if (health.error) {
        console.log('Error details:', health.error);
      }
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Make sure you copied the Transaction Pooler connection string from Supabase');
      console.log('2. Verify your password is correct');
      console.log('3. Check that your IP is allowed in Supabase dashboard');
      console.log('4. Ensure you are using port 6543 (Transaction Pooler), not 5432 (Direct)');
    }
  })
  .catch(error => {
    console.error('❌ Unexpected error during health check:', error.message);
  });








