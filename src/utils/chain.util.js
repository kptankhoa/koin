const { genesisBlock } = require('../constants/blockchain.const');
const transaction = require('../controller/transaction');
const { calculateHashForBlock, hashMatchesDifficulty } = require('./hash.util');
const { getCurrentTimestamp } = require('./time.util');

const hashMatchesBlockContent = (block) => {
  const blockHash = calculateHashForBlock(block);
  return blockHash === block.hash;
};

const isValidTimestamp = (newBlock, previousBlock) => {
  return (previousBlock.timestamp - 60 < newBlock.timestamp)
    && newBlock.timestamp - 60 < getCurrentTimestamp();
};

const hasValidHash = (block) => {
  if (!hashMatchesBlockContent(block)) {
    console.log('invalid hash, got:' + block.hash);
    return false;
  }
  if (!hashMatchesDifficulty(block.hash, block.difficulty)) {
    console.log('block difficulty not satisfied. Expected: ' + block.difficulty + 'got: ' + block.hash);
  }
  return true;
};

const isValidBlockStructure = (block) => {
  return typeof block.index === 'number'
    && typeof block.hash === 'string'
    && typeof block.previousHash === 'string'
    && typeof block.timestamp === 'number'
    && typeof block.data === 'object';
};

const isValidNewBlock = (newBlock, previousBlock) => {
  if (!isValidBlockStructure(newBlock)) {
    console.log('invalid block structure');
    return false;
  }
  if (previousBlock.index + 1 !== newBlock.index) {
    console.log('invalid index');
    return false;
  } else if (previousBlock.hash !== newBlock.previousHash) {
    console.log('invalid previousHash');
    return false;
  } else if (!isValidTimestamp(newBlock, previousBlock)) {
    console.log('invalid timestamp');
    return false;
  } else if (!hasValidHash(newBlock)) {
    return false;
  }
  return true;
};
/*
    Checks if the given blockchain is valid. Return the unspent txOuts if the chain is valid
 */
const isValidChain = (blockchainToValidate) => {
  console.log('isValidChain:');
  const isValidGenesis = (block) => {
    return JSON.stringify(block) === JSON.stringify(genesisBlock);
  };
  if (!isValidGenesis(blockchainToValidate[0])) {
    return null;
  }
  /*
    Validate each block in the chain. The block is valid if the block structure is valid and the transaction are valid
  */
  let aUnspentTxOuts = [];
  for (let i = 0; i < blockchainToValidate.length; i++) {
    const currentBlock = blockchainToValidate[i];
    if (i !== 0 && !isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1])) {
      return null;
    }
    aUnspentTxOuts = transaction.processTransactions(currentBlock.data, aUnspentTxOuts, currentBlock.index);
    if (aUnspentTxOuts === null) {
      console.log('invalid transactions in blockchain');
      return null;
    }
  }
  return aUnspentTxOuts;
};

module.exports = {
  isValidChain,
  isValidNewBlock
};
