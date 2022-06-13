const _ = require('lodash');
const transaction = require('./transaction');
const transactionPool = require('./transactionPool');
const wallet = require('./wallet');
const p2p = require('./p2p');
const dataHandler = require('../utils/data.util');
const Block = require('../model/block');
const { genesisBlock, DIFFICULTY_ADJUSTMENT_INTERVAL, BLOCK_GENERATION_INTERVAL } = require('../constants/blockchain.const');
const { getCurrentTimestamp } = require('../utils/time.util');
const { calculateHash, hashMatchesDifficulty } = require('../utils/hash.util');
const { isValidNewBlock, isValidChain } = require('../utils/chain.util');
const { isValidAddress } = require('../utils/transaction.util');

let blockchain = dataHandler.getChain();
if (!blockchain) {
  blockchain = [genesisBlock];
  dataHandler.rewriteChain(blockchain);
}
let unspentTxOuts = [];
for (const block of blockchain) {
  unspentTxOuts = transaction.processTransactions(block.data, unspentTxOuts, block.index);
}

const getBlockchain = () => {
  const fileBlockchain = dataHandler.getChain();
  if (fileBlockchain.length > blockchain.length && isValidChain(fileBlockchain)) {
    blockchain = fileBlockchain;
  }
  return blockchain;
};
exports.getBlockchain = getBlockchain;

const getUnspentTxOuts = () => _.cloneDeep(unspentTxOuts);
exports.getUnspentTxOuts = getUnspentTxOuts;

// and txPool should be only updated at the same time
const setUnspentTxOuts = (newUnspentTxOut) => {
  console.log('replacing unspentTxouts');
  unspentTxOuts = newUnspentTxOut;
};
const getLatestBlock = () => blockchain[blockchain.length - 1];
exports.getLatestBlock = getLatestBlock;

const getAdjustedDifficulty = (latestBlock, aBlockchain) => {
  const prevAdjustmentBlock = aBlockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
  const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
  const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
  if (timeTaken < timeExpected / 2) {
    return prevAdjustmentBlock.difficulty + 1;
  }
  if (timeTaken > timeExpected * 2) {
    if (prevAdjustmentBlock.difficulty === 0) {
      return prevAdjustmentBlock.difficulty;
    }
    return prevAdjustmentBlock.difficulty - 1;
  }
  return prevAdjustmentBlock.difficulty;
};

const getDifficulty = (aBlockchain) => {
  const latestBlock = aBlockchain[blockchain.length - 1];
  if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
    return getAdjustedDifficulty(latestBlock, aBlockchain);
  } else {
    return latestBlock.difficulty;
  }
};

const findBlock = (index, previousHash, timestamp, data, difficulty) => {
  let nonce = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const hash = calculateHash(index, previousHash, timestamp, data, difficulty, nonce);
    if (hashMatchesDifficulty(hash, difficulty)) {
      return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
    }
    nonce++;
  }
};

const addBlockToChain = (newBlock) => {
  if (isValidNewBlock(newBlock, getLatestBlock())) {
    const retVal = transaction.processTransactions(newBlock.data, getUnspentTxOuts(), newBlock.index);
    if (retVal === null) {
      console.log('block is not valid in terms of transactions');
      return false;
    } else {
      blockchain.push(newBlock);
      setUnspentTxOuts(retVal);
      transactionPool.updateTransactionPool(unspentTxOuts);
      return true;
    }
  }
  return false;
};
exports.addBlockToChain = addBlockToChain;

const generateRawNextBlock = (blockData) => {
  const previousBlock = getLatestBlock();
  const difficulty = getDifficulty(getBlockchain());
  const nextIndex = previousBlock.index + 1;
  const nextTimestamp = getCurrentTimestamp();
  const newBlock = findBlock(nextIndex, previousBlock.hash, nextTimestamp, blockData, difficulty);
  if (addBlockToChain(newBlock)) {
    dataHandler.rewriteChain(blockchain);
    p2p.broadcastLatest();
    return newBlock;
  } else {
    return null;
  }
};
exports.generateRawNextBlock = generateRawNextBlock;

// gets the unspent transaction outputs owned by the wallet
const getMyUnspentTransactionOutputs = () => {
  return wallet.findUnspentTxOuts(wallet.getPublicFromWallet(), getUnspentTxOuts());
};
exports.getMyUnspentTransactionOutputs = getMyUnspentTransactionOutputs;

const generateNextBlock = () => {
  if (!transactionPool.getTransactionPool().length){
    throw Error('Transaction pool is empty!');
  }
  const coinbaseTx = transaction.getCoinbaseTransaction(wallet.getPublicFromWallet(), getLatestBlock().index + 1);
  const blockData = [coinbaseTx].concat(transactionPool.getTransactionPool());
  return generateRawNextBlock(blockData);
};
exports.generateNextBlock = generateNextBlock;

const sendRegisterRwBlock = (address) => {
  const coinbaseTx = transaction.getCoinbaseTransaction(address, getLatestBlock().index + 1);
  const blockData = [coinbaseTx];
  return generateRawNextBlock(blockData);
};
exports.sendRegisterRwBlock = sendRegisterRwBlock;

const generateNextBlockWithTransaction = (receiverAddress, amount) => {
  if (!isValidAddress(receiverAddress)) {
    throw Error('Invalid address');
  }
  if (typeof amount !== 'number') {
    throw Error('Invalid amount');
  }
  const coinbaseTx = transaction.getCoinbaseTransaction(wallet.getPublicFromWallet(), getLatestBlock().index + 1);
  const tx = wallet.createTransaction(
    receiverAddress, amount, wallet.getPrivateFromWallet(), getUnspentTxOuts(), transactionPool.getTransactionPool());
  const blockData = [coinbaseTx, tx];
  return generateRawNextBlock(blockData);
};
exports.generateNextBlockWithTransaction = generateNextBlockWithTransaction;

const getAccountBalance = () => {
  return wallet.getBalance(wallet.getPublicFromWallet(), unspentTxOuts);
};
exports.getAccountBalance = getAccountBalance;

const sendTransaction = (address, amount) => {
  const tx = wallet.createTransaction(address, amount, wallet.getPrivateFromWallet(), getUnspentTxOuts(), transactionPool.getTransactionPool());
  transactionPool.addToTransactionPool(tx, getUnspentTxOuts());
  p2p.broadcastTransactionPool();
  return tx;
};
exports.sendTransaction = sendTransaction;

const getAccumulatedDifficulty = (aBlockchain) => {
  return aBlockchain
    .map((block) => block.difficulty)
    .map((difficulty) => Math.pow(2, difficulty))
    .reduce((a, b) => a + b);
};

const replaceChain = (newBlocks) => {
  const aUnspentTxOuts = isValidChain(newBlocks);
  const validChain = aUnspentTxOuts !== null;
  if (validChain && getAccumulatedDifficulty(newBlocks) > getAccumulatedDifficulty(getBlockchain())) {
    console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
    blockchain = newBlocks;
    setUnspentTxOuts(aUnspentTxOuts);
    transactionPool.updateTransactionPool(unspentTxOuts);
    dataHandler.rewriteChain(blockchain);
    p2p.broadcastLatest();
  } else {
    console.log('Received blockchain invalid');
  }
};
exports.replaceChain = replaceChain;
const handleReceivedTransaction = (transaction) => {
  transactionPool.addToTransactionPool(transaction, getUnspentTxOuts());
};
exports.handleReceivedTransaction = handleReceivedTransaction;
