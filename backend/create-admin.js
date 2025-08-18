const bcrypt = require('bcrypt');
const { getPrisma } = require('./src/utils/prisma');

async function createAdmin() {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      console.error('Database not configured');
      return;
    }

    const adminData = {
      name: 'Admin User',
      email: 'realadmin@test.com',
      password: 'adminpass123',
      isActive: true,
      commissionRate: 70,
      adminRole: 'ADMIN',
      walletAddress: '0x0000000000000000000000000000000000000000',
      applicationStatus: 'APPROVED'
    };

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // Create the admin account
    const admin = await prisma.creator.create({
      data: {
        ...adminData,
        password: hashedPassword
      }
    });

    console.log('✅ Admin account created successfully!');
    console.log('Email:', admin.email);
    console.log('Role:', admin.adminRole);
    console.log('ID:', admin.id);

  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️  Admin account already exists');
    } else {
      console.error('❌ Error creating admin:', error);
    }
  } finally {
    process.exit(0);
  }
}

createAdmin();
