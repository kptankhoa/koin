const hexCharToBin = (hex) => (parseInt(hex, 16).toString(2)).padStart(4, '0');

const hexToBin = (hexStr) => {
  return hexStr.split('').reduce((preValue, curValue) => preValue + hexCharToBin(curValue), '');
};

module.exports = hexToBin;
