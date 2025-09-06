#!/usr/bin/env node

/**
 * Production Verification Script: Check Creator Sales History
 * Verifies sales history and commission calculations for sohailkhan521456@gmail.com
 */

// Import Prisma from backend location
const { PrismaClient } = require('./backend/node_modules/@prisma/client');

async function checkCreatorProduction() {
  console.log('🔍 Checking Production Sales History for sohailkhan521456@gmail.com\n');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Get creator details
    const creator = await prisma.creator.findUnique({
      where: { email: 'sohailkhan521456@gmail.com' },
      select: {
        id: true,
        name: true,
        email: true,
        impactSubId: true,
        commissionRate: true,
        isActive: true,
        applicationStatus: true,
        createdAt: true
      }
    });

    if (!creator) {
      console.log('❌ Creator not found in database');
      return;
    }

    console.log('👤 Creator Details:');
    console.log('==================');
    console.log(`Name: ${creator.name}`);
    console.log(`Email: ${creator.email}`);
    console.log(`ID: ${creator.id}`);
    console.log(`Impact SubId: ${creator.impactSubId}`);
    console.log(`Commission Rate: ${creator.commissionRate}%`);
    console.log(`Status: ${creator.applicationStatus} (Active: ${creator.isActive})`);
    console.log(`Created: ${creator.createdAt}`);
    console.log('');

    // 2. Get earnings from database
    const earnings = await prisma.earning.findMany({
      where: { creatorId: creator.id },
      select: {
        id: true,
        amount: true,
        type: true,
        status: true,
        impactTransactionId: true,
        createdAt: true,
        appliedCommissionRate: true,
        grossAmount: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('💰 Database Earnings:');
    console.log('====================');
    console.log(`Total earnings records: ${earnings.length}`);
    
    if (earnings.length > 0) {
      const completedEarnings = earnings.filter(e => e.status === 'COMPLETED');
      const processingEarnings = earnings.filter(e => e.status === 'PROCESSING');
      const pendingEarnings = earnings.filter(e => e.status === 'PENDING');
      
      const totalCompleted = completedEarnings.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalProcessing = processingEarnings.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalPending = pendingEarnings.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalAll = earnings.reduce((sum, e) => sum + Number(e.amount), 0);

      console.log(`COMPLETED: ${completedEarnings.length} records = $${totalCompleted.toFixed(2)}`);
      console.log(`PROCESSING: ${processingEarnings.length} records = $${totalProcessing.toFixed(2)}`);
      console.log(`PENDING: ${pendingEarnings.length} records = $${totalPending.toFixed(2)}`);
      console.log(`TOTAL: ${earnings.length} records = $${totalAll.toFixed(2)}`);
      console.log('');

      // Show recent earnings details
      console.log('📊 Recent Earnings (Last 10):');
      console.log('=============================');
      earnings.slice(0, 10).forEach((earning, index) => {
        console.log(`${index + 1}. $${earning.amount} | ${earning.status} | ${earning.type} | ${earning.createdAt.toISOString().split('T')[0]} | Impact ID: ${earning.impactTransactionId || 'N/A'}`);
        if (earning.appliedCommissionRate || earning.grossAmount) {
          console.log(`   Rate: ${earning.appliedCommissionRate || 'N/A'}% | Gross: $${earning.grossAmount || 'N/A'}`);
        }
      });
      console.log('');
    } else {
      console.log('No earnings found in database');
      console.log('');
    }

    // 3. Get links created by this creator
    const links = await prisma.link.findMany({
      where: { creatorId: creator.id },
      select: {
        id: true,
        destinationUrl: true,
        impactLink: true,
        shortLink: true,
        clicks: true,
        conversions: true,
        revenue: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('🔗 Creator Links:');
    console.log('================');
    console.log(`Total links: ${links.length}`);
    
    if (links.length > 0) {
      const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0);
      const totalConversions = links.reduce((sum, l) => sum + l.conversions, 0);
      const totalRevenue = links.reduce((sum, l) => sum + Number(l.revenue), 0);
      const activeLinks = links.filter(l => l.isActive).length;

      console.log(`Active links: ${activeLinks}/${links.length}`);
      console.log(`Total clicks: ${totalClicks}`);
      console.log(`Total conversions: ${totalConversions}`);
      console.log(`Total revenue: $${totalRevenue.toFixed(2)}`);
      console.log('');

      // Show recent links
      console.log('📊 Recent Links (Last 5):');
      console.log('=========================');
      links.slice(0, 5).forEach((link, index) => {
        const url = link.destinationUrl.length > 50 ? link.destinationUrl.substring(0, 50) + '...' : link.destinationUrl;
        console.log(`${index + 1}. ${url}`);
        console.log(`   Clicks: ${link.clicks} | Conversions: ${link.conversions} | Revenue: $${link.revenue} | Active: ${link.isActive}`);
        console.log(`   Created: ${link.createdAt.toISOString().split('T')[0]}`);
      });
      console.log('');
    } else {
      console.log('No links found');
      console.log('');
    }

    // 4. Get payout requests
    const payouts = await prisma.payoutRequest.findMany({
      where: { creatorId: creator.id },
      select: {
        id: true,
        amount: true,
        status: true,
        requestedAt: true,
        processedAt: true
      },
      orderBy: { requestedAt: 'desc' }
    });

    console.log('💸 Payout Requests:');
    console.log('==================');
    console.log(`Total payout requests: ${payouts.length}`);
    
    if (payouts.length > 0) {
      const totalRequested = payouts.reduce((sum, p) => sum + Number(p.amount), 0);
      const pendingPayouts = payouts.filter(p => p.status === 'PENDING');
      const completedPayouts = payouts.filter(p => p.status === 'COMPLETED');
      
      console.log(`Total requested: $${totalRequested.toFixed(2)}`);
      console.log(`Pending: ${pendingPayouts.length} requests`);
      console.log(`Completed: ${completedPayouts.length} requests`);
      console.log('');

      payouts.forEach((payout, index) => {
        console.log(`${index + 1}. $${payout.amount} | ${payout.status} | ${payout.requestedAt.toISOString().split('T')[0]}`);
      });
      console.log('');
    } else {
      console.log('No payout requests found');
      console.log('');
    }

    // 5. Show what API endpoints would return
    console.log('🔍 API Endpoint Summary:');
    console.log('========================');
    console.log('This creator should see in their dashboard:');
    console.log(`- Impact SubId1: ${creator.impactSubId}`);
    console.log(`- Commission Rate: ${creator.commissionRate}%`);
    console.log(`- Database earnings will be combined with Impact.com pending data`);
    console.log(`- Sales history will show customer purchase amounts + creator commission`);
    console.log('');

    console.log('📋 Next Steps:');
    console.log('==============');
    console.log('1. Provide Impact.com data for SubId1:', creator.impactSubId);
    console.log('2. Compare with creator dashboard data');
    console.log('3. Verify commission calculations match');
    console.log('4. Check if sales history shows correct customer purchase amounts');
    console.log('');

    console.log('✅ Production check completed successfully!');

  } catch (error) {
    console.error('❌ Error checking production data:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
if (require.main === module) {
  checkCreatorProduction();
}

module.exports = { checkCreatorProduction };
