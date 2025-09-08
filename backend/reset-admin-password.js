const bcrypt = require('bcrypt');
const { getPrisma } = require('./src/utils/prisma');

async function resetAdminPassword() {
  try {
    console.log('🔧 Admin Password Reset Tool');
    console.log('============================');
    
    const prisma = getPrisma();
    if (!prisma) {
      console.error('❌ Database not available');
      return;
    }

    // Get admin email from command line or use default
    const adminEmail = process.argv[2] || 'admin@zylike.com';
    const newPassword = process.argv[3] || 'admin123';

    console.log(`📧 Looking for admin with email: ${adminEmail}`);
    
    // Find the admin user
    const admin = await prisma.creator.findUnique({
      where: { email: adminEmail }
    });

    if (!admin) {
      console.error(`❌ No user found with email: ${adminEmail}`);
      console.log('\n📋 Available admin users:');
      const allAdmins = await prisma.creator.findMany({
        where: {
          OR: [
            { adminRole: 'ADMIN' },
            { adminRole: 'SUPER_ADMIN' }
          ]
        },
        select: { email: true, adminRole: true, name: true }
      });
      
      if (allAdmins.length === 0) {
        console.log('   No admin users found in database');
      } else {
        allAdmins.forEach(admin => {
          console.log(`   - ${admin.email} (${admin.adminRole}) - ${admin.name}`);
        });
      }
      return;
    }

    console.log(`✅ Found admin: ${admin.name} (${admin.email})`);
    console.log(`🔑 Current role: ${admin.adminRole || 'USER'}`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    await prisma.creator.update({
      where: { id: admin.id },
      data: { password: hashedPassword }
    });

    console.log('\n🎉 Password reset successful!');
    console.log('============================');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log(`👤 Role: ${admin.adminRole || 'USER'}`);
    console.log('\n⚠️  Please change this password after logging in!');

  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
resetAdminPassword();
