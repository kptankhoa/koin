const ecdsa = require('elliptic');
const ec = new ecdsa.ec('secp256k1');

const getPublicKey = (aPrivateKey) => {
  return ec.keyFromPrivate(aPrivateKey, 'hex').getPublic().encode('hex');
};

module.exports = {
  getPublicKey
};
