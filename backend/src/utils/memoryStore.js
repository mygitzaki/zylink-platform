// Simple in-memory store for development when DATABASE_URL is not set
const shortCodeToUrl = new Map();

function saveShortLink(shortCode, destinationUrl) {
  shortCodeToUrl.set(shortCode, destinationUrl);
}

function getShortLink(shortCode) {
  return shortCodeToUrl.get(shortCode);
}

module.exports = { saveShortLink, getShortLink };







