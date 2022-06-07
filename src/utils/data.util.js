const fs = require('fs');
const { KEYS_PATH, CHAIN_PATH } = require('../constants/paths.const');

const getKeys = () => {
  try {
    const data = fs.readFileSync(KEYS_PATH);
    if (data.length !== 0) {
      return JSON.parse(data.toString());
    }
    return [];
  } catch (err) {
    console.log(err);
    return [];
  }
};
exports.getKeys = getKeys;

const addKey = (key) => {
  const keys = getKeys();
  keys.push(key);
  fs.writeFileSync(KEYS_PATH, JSON.stringify(keys, null, 2));
};
exports.addKey = addKey;

const rewriteKeySet = (keys) => {
  fs.writeFileSync(KEYS_PATH, JSON.stringify(keys, null, 2));
};
exports.rewriteKeySet = rewriteKeySet;

const getChain = () => {
  try {
    const data = fs.readFileSync(CHAIN_PATH);
    if (data.length !== 0) {
      return JSON.parse(data.toString());
    }
    return null;
  } catch (err) {
    return null;
  }
};
exports.getChain = getChain;

const rewriteChain = (blockchain) => {
  fs.writeFileSync(CHAIN_PATH, JSON.stringify(blockchain, null, 2));
};

exports.rewriteChain = rewriteChain;
