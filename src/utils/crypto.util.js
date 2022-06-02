const CryptoJS = require('crypto-js');

const sha256EncryptedString = (str) => CryptoJS.SHA256(str).toString();

module.exports = {
  sha256EncryptedString
};
