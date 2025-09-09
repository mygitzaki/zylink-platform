const { getPrisma } = require('./src/utils/prisma');

async function makePreplygikiAdmin() {
  const prisma = getPrisma();
  
  if (!prisma) {
    console.error('❌ Database not available');
    return;
  }

  try {
    const email = 'preplygiki@gmail.com';
    
    // Check if user exists
    const user = await prisma.creator.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ User not found:', email);
      return;
    }

    console.log('👤 Current user details:', {
      id: user.id,
      email: user.email,
      name: user.name,
      adminRole: user.adminRole,
      isActive: user.isActive,
      applicationStatus: user.applicationStatus
    });

    // Update user to admin
    const updatedUser = await prisma.creator.update({
      where: { email },
      data: {
        adminRole: 'ADMIN',
        isActive: true,
        applicationStatus: 'APPROVED'
      }
    });

    console.log('✅ User updated to admin successfully:', {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      adminRole: updatedUser.adminRole,
      isActive: updatedUser.isActive,
      applicationStatus: updatedUser.applicationStatus
    });

    console.log('🎉 preplygiki@gmail.com is now an ADMIN user!');

  } catch (error) {
    console.error('❌ Error updating user to admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makePreplygikiAdmin();
