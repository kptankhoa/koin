const hexCharToBin = (hex) => (parseInt(hex, 16).toString(2)).padStart(4, '0');

const hexToBin = (hexStr) => {
  return hexStr.split('').reduce((preValue, curValue) => preValue + hexCharToBin(curValue), '');
};

const toHexString = (byteArray) => {
  return Array.from(byteArray, (byte) => {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
};

module.exports = { hexToBin, toHexString };
