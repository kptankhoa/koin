const fs = require('fs');

const getKeys = () => {
  try {
    const data = fs.readFileSync('data/keys.json');
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
  fs.writeFileSync('data/keys.json', JSON.stringify(keys, null, 2));
};
exports.addKey = addKey;

const rewriteKeySet = (keys) => {
  fs.writeFileSync('data/keys.json', JSON.stringify(keys, null, 2));
};
exports.rewriteKeySet = rewriteKeySet;

const getChain = () => {
  try {
    const data = fs.readFileSync('data/chain.json');
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
  fs.writeFileSync('data/chain.json', JSON.stringify(blockchain, null, 2));
};

exports.rewriteChain = rewriteChain;
