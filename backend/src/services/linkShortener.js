const { customAlphabet } = require('nanoid');

class LinkShortener {
  constructor() {
    this.alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    // 12-char uppercase alphanumeric for high entropy (~62 bits)
    this.nanoid = customAlphabet(this.alphabet, 12);
  }

  generateShortCode() {
    return this.nanoid();
  }

  createShortLink(destinationUrl, creatorId) {
    const shortCode = this.generateShortCode();
    const base = process.env.SHORTLINK_BASE || 'https://zylink.app/s';
    const baseTrimmed = base.replace(/\/$/, '');
    const shortLink = `${baseTrimmed}/${shortCode}`;
    return { shortCode, shortLink, destinationUrl, creatorId };
  }
}

module.exports = { LinkShortener };





