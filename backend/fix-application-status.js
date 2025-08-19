const { getPrisma } = require('./src/utils/prisma');

async function fixApplicationStatus() {
  const prisma = getPrisma();
  if (!prisma) {
    console.error('❌ Database not configured');
    return;
  }

  try {
    console.log('🔍 Checking for creators with PENDING status but no application data...');
    
    // Find creators who have PENDING status but no bio or social media links
    const creatorsToFix = await prisma.creator.findMany({
      where: {
        applicationStatus: 'PENDING',
        OR: [
          { bio: null },
          { bio: '' }
        ]
      },
      select: {
        id: true,
        email: true,
        bio: true,
        applicationStatus: true
      }
    });

    console.log(`📊 Found ${creatorsToFix.length} creators to fix`);

    if (creatorsToFix.length > 0) {
      // Reset their application status to null
      const result = await prisma.creator.updateMany({
        where: {
          applicationStatus: 'PENDING',
          OR: [
            { bio: null },
            { bio: '' }
          ]
        },
        data: {
          applicationStatus: null
        }
      });

      console.log(`✅ Fixed ${result.count} creators - reset application status to null`);
      
      // Show details of what was fixed
      creatorsToFix.forEach(creator => {
        console.log(`   - ${creator.email}: Reset from PENDING to null`);
      });
    } else {
      console.log('✅ No creators need fixing');
    }

    // Show current status distribution
    const statusCounts = await prisma.creator.groupBy({
      by: ['applicationStatus'],
      _count: { id: true }
    });

    console.log('\n📈 Current application status distribution:');
    statusCounts.forEach(status => {
      console.log(`   - ${status.applicationStatus || 'NULL'}: ${status._count.id}`);
    });

  } catch (error) {
    console.error('❌ Error fixing application status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixApplicationStatus();
