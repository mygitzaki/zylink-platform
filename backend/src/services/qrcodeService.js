const QRCode = require('qrcode');

class QRCodeService {
  async generateQRCode(shortLink) {
    const qrCodeDataURL = await QRCode.toDataURL(shortLink, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
    return qrCodeDataURL;
  }
}

module.exports = { QRCodeService };







