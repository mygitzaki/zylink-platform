#!/usr/bin/env node
/*
 * Safe one-off password reset tool
 * Usage: node backend/scripts/set-password.js <email> <newPassword>
 */

const path = require('path');

// Load environment from backend/.env if present
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {}

const bcrypt = require('bcryptjs');
const { getPrisma } = require('../src/utils/prisma');

async function main() {
  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error('Usage: node backend/scripts/set-password.js <email> <newPassword>');
    process.exit(1);
  }

  const prisma = getPrisma();
  if (!prisma) {
    console.error('Prisma is not configured. Ensure DATABASE_URL is set.');
    process.exit(1);
  }

  const user = await prisma.creator.findUnique({ where: { email } });
  if (!user) {
    console.error(`No creator found for email: ${email}`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.creator.update({ where: { email }, data: { password: hash } });
  console.log(`Password updated for ${email}.`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Error updating password:', err);
  process.exit(1);
});




