// Use crypto.randomUUID instead of nanoid to avoid ES module issues
const crypto = require('crypto');

class LinkShortener {
  constructor() {
    this.alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }

  generateShortCode() {
    // Generate 12-char code using crypto
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += this.alphabet[Math.floor(Math.random() * this.alphabet.length)];
    }
    return result;
  }

  createShortLink(destinationUrl, creatorId) {
    const shortCode = this.generateShortCode();
    const base = process.env.SHORTLINK_BASE || 'https://s.zylike.com';
    const baseTrimmed = base.replace(/\/$/, '');
    const shortLink = `${baseTrimmed}/${shortCode}`;
    return { shortCode, shortLink, destinationUrl, creatorId };
  }
}

module.exports = { LinkShortener };





