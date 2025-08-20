const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addShortLinkField() {
  try {
    console.log('🔧 Adding shortLink field to ShortLink table...');
    
    // Check if the column already exists
    const columnCheck = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ShortLink' AND column_name = 'shortLink'
    `;
    
    if (columnCheck.length > 0) {
      console.log('✅ shortLink column already exists');
      return;
    }
    
    // Add the shortLink column
    await prisma.$executeRaw`ALTER TABLE "ShortLink" ADD COLUMN "shortLink" TEXT`;
    console.log('✅ shortLink column added successfully');
    
    // Update existing records with the shortLink value
    const shortLinks = await prisma.shortLink.findMany({
      select: { id: true, shortCode: true }
    });
    
    console.log(`📝 Updating ${shortLinks.length} existing short links...`);
    
    for (const shortLink of shortLinks) {
      const fullShortLink = `${process.env.SHORTLINK_BASE || 'https://s.zylike.com'}/${shortLink.shortCode}`;
      
      await prisma.shortLink.update({
        where: { id: shortLink.id },
        data: { shortLink: fullShortLink }
      });
    }
    
    console.log('✅ All existing short links updated with shortLink field');
    
    // Make the column NOT NULL
    await prisma.$executeRaw`ALTER TABLE "ShortLink" ALTER COLUMN "shortLink" SET NOT NULL`;
    console.log('✅ shortLink column set to NOT NULL');
    
    console.log('🎉 ShortLink table migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding shortLink field:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addShortLinkField();
