#!/usr/bin/env node

/**
 * Database Update Script: Set Correct Impact.com SubId1 Values
 * This script updates the database with the actual Impact.com SubId1 values
 */

const { PrismaClient } = require('@prisma/client');

async function updateCreatorSubIds() {
  console.log('🔧 Updating Creator Impact.com SubId1 Values...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Known creator mappings (from Impact.com data)
    const creatorMappings = [
      {
        email: 'sohailkhan521456@gmail.com',
        impactSubId: '3bbffc5d-e3f7-4c27-91e2-4aefaa063657',
        name: 'Sohail Khan'
      },
      {
        email: 'tofique.ahmad@example.com', // Replace with actual email
        impactSubId: 'c5020123-b302-4503-8b00-5829c3210be3',
        name: 'Tofique Ahmad'
      }
      // Add more creators as needed
    ];
    
    console.log('📊 Updating creators with Impact.com SubId1 values:');
    console.log('==================================================');
    
    for (const mapping of creatorMappings) {
      try {
        // Find creator by email
        const creator = await prisma.creator.findUnique({
          where: { email: mapping.email },
          select: { id: true, email: true, name: true, impactSubId: true }
        });
        
        if (!creator) {
          console.log(`❌ Creator not found: ${mapping.email}`);
          continue;
        }
        
        if (creator.impactSubId === mapping.impactSubId) {
          console.log(`✅ ${mapping.name} (${mapping.email}): Already has correct SubId1`);
          continue;
        }
        
        // Update the creator
        const updated = await prisma.creator.update({
          where: { id: creator.id },
          data: { impactSubId: mapping.impactSubId }
        });
        
        console.log(`🔄 ${mapping.name} (${mapping.email}): Updated SubId1 from "${creator.impactSubId || 'NULL'}" to "${mapping.impactSubId}"`);
        
      } catch (error) {
        console.error(`❌ Error updating ${mapping.email}:`, error.message);
      }
    }
    
    // Show current state
    console.log('\n📋 Current Creator SubId1 Status:');
    console.log('==================================');
    
    const allCreators = await prisma.creator.findMany({
      select: { id: true, email: true, name: true, impactSubId: true }
    });
    
    allCreators.forEach(creator => {
      const status = creator.impactSubId ? '✅ Set' : '❌ Missing';
      console.log(`${status} ${creator.name} (${creator.email}): ${creator.impactSubId || 'NULL'}`);
    });
    
    console.log('\n✅ Creator SubId1 update completed!');
    
  } catch (error) {
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateCreatorSubIds();
