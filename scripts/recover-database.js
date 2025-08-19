#!/usr/bin/env node

/**
 * Database Recovery Script for Zylink Platform
 * 
 * WARNING: This script will overwrite your current database!
 * Only use when you need to restore from a backup.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const BACKUP_DIR = path.join(__dirname, '../backups');
const BACKUP_PREFIX = 'zylink-backup';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚨 DATABASE RECOVERY SCRIPT');
console.log('⚠️  WARNING: This will overwrite your current database!');
console.log('');

// Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not found');
  console.log('💡 Please set DATABASE_URL in your environment');
  process.exit(1);
}

// List available backups
function listBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      console.log('❌ No backup directory found');
      return [];
    }
    
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith(BACKUP_PREFIX) && file.endsWith('.sql'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        return {
          name: file,
          path: filePath,
          size: fileSizeInMB,
          date: stats.mtime.toISOString().split('T')[0],
          time: stats.mtime.toISOString().split('T')[1].split('.')[0]
        };
      })
      .sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
    
    if (files.length === 0) {
      console.log('❌ No backup files found');
      return [];
    }
    
    console.log('📁 Available backups:');
    console.log('');
    
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   📅 Date: ${file.date} ${file.time}`);
      console.log(`   📊 Size: ${file.size} MB`);
      console.log('');
    });
    
    return files;
  } catch (err) {
    console.error('❌ Error listing backups:', err.message);
    return [];
  }
}

// Verify backup file
function verifyBackup(backupPath) {
  try {
    if (!fs.existsSync(backupPath)) {
      return { valid: false, error: 'Backup file not found' };
    }
    
    const stats = fs.statSync(backupPath);
    if (stats.size === 0) {
      return { valid: false, error: 'Backup file is empty' };
    }
    
    // Check if it's a valid SQL file
    const content = fs.readFileSync(backupPath, 'utf8').substring(0, 100);
    if (!content.includes('-- PostgreSQL database dump')) {
      return { valid: false, error: 'Backup file is not a valid PostgreSQL dump' };
    }
    
    return { valid: true, size: stats.size };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// Perform database recovery
function performRecovery(backupPath) {
  return new Promise((resolve, reject) => {
    console.log('🔄 Starting database recovery...');
    console.log(`📁 Restoring from: ${path.basename(backupPath)}`);
    
    // First, drop all connections to the database
    const dropConnectionsCommand = `psql "${process.env.DATABASE_URL}" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();"`;
    
    exec(dropConnectionsCommand, (error, stdout, stderr) => {
      if (error) {
        console.log('⚠️  Warning: Could not drop connections (this is normal for some databases)');
      }
      
      // Now restore the database
      const restoreCommand = `psql "${process.env.DATABASE_URL}" < "${backupPath}"`;
      
      console.log('📊 Restoring database...');
      console.log('⏳ This may take several minutes depending on database size...');
      
      exec(restoreCommand, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Recovery failed:', error.message);
          reject(error);
          return;
        }
        
        if (stderr) {
          console.log('⚠️  Recovery warnings (some are normal):', stderr);
        }
        
        console.log('✅ Database recovery completed successfully!');
        console.log('🔄 Your database has been restored from the backup');
        resolve();
      });
    });
  });
}

// Main recovery process
async function main() {
  try {
    const backups = listBackups();
    
    if (backups.length === 0) {
      console.log('💡 No backups available for recovery');
      process.exit(0);
    }
    
    // Ask user to confirm
    rl.question('❓ Are you sure you want to proceed with database recovery? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Recovery cancelled by user');
        rl.close();
        process.exit(0);
      }
      
      // Ask user to select backup
      rl.question(`📋 Select backup number (1-${backups.length}): `, async (selection) => {
        const backupIndex = parseInt(selection) - 1;
        
        if (isNaN(backupIndex) || backupIndex < 0 || backupIndex >= backups.length) {
          console.log('❌ Invalid selection');
          rl.close();
          process.exit(1);
        }
        
        const selectedBackup = backups[backupIndex];
        console.log(`✅ Selected backup: ${selectedBackup.name}`);
        
        // Verify the backup
        const verification = verifyBackup(selectedBackup.path);
        if (!verification.valid) {
          console.error(`❌ Backup verification failed: ${verification.error}`);
          rl.close();
          process.exit(1);
        }
        
        console.log(`✅ Backup verified: ${verification.size} bytes`);
        
        // Final confirmation
        rl.question('🚨 FINAL WARNING: This will completely overwrite your current database. Continue? (yes/no): ', async (finalAnswer) => {
          if (finalAnswer.toLowerCase() !== 'yes') {
            console.log('❌ Recovery cancelled by user');
            rl.close();
            process.exit(0);
          }
          
          try {
            await performRecovery(selectedBackup.path);
            console.log('🎉 Recovery completed successfully!');
            console.log('💡 Your Zylink platform is now restored from the backup');
          } catch (error) {
            console.error('❌ Recovery failed:', error.message);
            console.log('💡 Please check your database connection and try again');
            process.exit(1);
          } finally {
            rl.close();
          }
        });
      });
    });
    
  } catch (error) {
    console.error('❌ Recovery script error:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n❌ Recovery cancelled by user');
  rl.close();
  process.exit(0);
});

// Run the main function
if (require.main === module) {
  main();
}

module.exports = {
  listBackups,
  verifyBackup,
  performRecovery
};
