#!/usr/bin/env node

/**
 * Database Backup Script for Zylink Platform
 * 
 * This script creates automated backups of your Supabase database
 * Run this daily/weekly to ensure data safety
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = 30; // Keep last 30 backups
const BACKUP_PREFIX = 'zylink-backup';

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Get current timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFileName = `${BACKUP_PREFIX}-${timestamp}.sql`;
const backupPath = path.join(BACKUP_DIR, backupFileName);

console.log('🚀 Starting Zylink database backup...');
console.log(`📁 Backup file: ${backupFileName}`);

// Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not found');
  console.log('💡 Please set DATABASE_URL in your environment');
  process.exit(1);
}

// Create backup using pg_dump
const backupCommand = `pg_dump "${process.env.DATABASE_URL}" --no-owner --no-privileges --clean --if-exists > "${backupPath}"`;

console.log('📊 Creating database backup...');

exec(backupCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
  
  if (stderr) {
    console.log('⚠️  Backup warnings:', stderr);
  }
  
  // Check if backup file was created and has content
  if (fs.existsSync(backupPath)) {
    const stats = fs.statSync(backupPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    if (stats.size > 0) {
      console.log(`✅ Backup completed successfully!`);
      console.log(`📊 File size: ${fileSizeInMB} MB`);
      console.log(`📍 Location: ${backupPath}`);
      
      // Clean up old backups
      cleanupOldBackups();
      
      // Create backup manifest
      createBackupManifest(backupFileName, fileSizeInMB);
      
    } else {
      console.error('❌ Backup file is empty');
      fs.unlinkSync(backupPath);
      process.exit(1);
    }
  } else {
    console.error('❌ Backup file was not created');
    process.exit(1);
  }
});

// Clean up old backups
function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith(BACKUP_PREFIX) && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by newest first
    
    if (files.length > MAX_BACKUPS) {
      const filesToDelete = files.slice(MAX_BACKUPS);
      console.log(`🧹 Cleaning up ${filesToDelete.length} old backups...`);
      
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          console.log(`🗑️  Deleted: ${file.name}`);
        } catch (err) {
          console.error(`❌ Failed to delete ${file.name}:`, err.message);
        }
      });
    }
  } catch (err) {
    console.error('❌ Error during cleanup:', err.message);
  }
}

// Create backup manifest
function createBackupManifest(backupFileName, fileSize) {
  const manifest = {
    backupFile: backupFileName,
    timestamp: new Date().toISOString(),
    fileSize: `${fileSize} MB`,
    platform: 'Zylink',
    version: '1.0.0',
    database: 'PostgreSQL (Supabase)',
    backupType: 'Full Database Dump'
  };
  
  const manifestPath = path.join(BACKUP_DIR, 'backup-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`📋 Backup manifest created: backup-manifest.json`);
}

// Backup verification function
function verifyBackup(backupPath) {
  return new Promise((resolve, reject) => {
    // Check if file exists and has content
    if (!fs.existsSync(backupPath)) {
      reject(new Error('Backup file not found'));
      return;
    }
    
    const stats = fs.statSync(backupPath);
    if (stats.size === 0) {
      reject(new Error('Backup file is empty'));
      return;
    }
    
    // Check if it's a valid SQL file
    const content = fs.readFileSync(backupPath, 'utf8').substring(0, 100);
    if (!content.includes('-- PostgreSQL database dump')) {
      reject(new Error('Backup file is not a valid PostgreSQL dump'));
      return;
    }
    
    resolve({
      size: stats.size,
      isValid: true
    });
  });
}

// Export functions for testing
module.exports = {
  verifyBackup,
  cleanupOldBackups,
  createBackupManifest
};

console.log('🔒 Backup script loaded successfully');
console.log('💡 Run this script with: node scripts/backup-database.js');
console.log('💡 Or add to cron for automated backups');
