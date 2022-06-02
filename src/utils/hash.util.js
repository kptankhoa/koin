const { hexToBin } = require('./string.util');
const { sha256EncryptedString } = require('./crypto.util');

const calculateHash = (
  index, previousHash, timestamp, data, difficulty, nonce
) => sha256EncryptedString(index + previousHash + timestamp + data + difficulty + nonce);

const calculateHashForBlock = (block) => calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce);

//PoW algorithm
const hashMatchesDifficulty = (hash, difficulty) => {
  const hashInBinary = hexToBin(hash);
  const requiredPrefix = '0'.repeat(difficulty);
  return hashInBinary.startsWith(requiredPrefix);
};

module.exports = { calculateHash, calculateHashForBlock, hashMatchesDifficulty };
