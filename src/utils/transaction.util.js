// valid address is a valid ecdsa public key in the 04 + X-coordinate + Y-coordinate format
const { COINBASE_AMOUNT } = require('../constants/blockchain.const');
const { sha256EncryptedString } = require('./crypto.util');
const _ = require('lodash');
const isValidAddress = (address) => {
  if (address.length !== 130) {
    console.log('invalid public key length');
    return false;
  } else if (address.match('^[a-fA-F0-9]+$') === null) {
    console.log('public key must contain only hex characters');
    return false;
  } else if (!address.startsWith('04')) {
    console.log('public key must start with 04');
    return false;
  }
  return true;
};

const isValidTxInStructure = (txIn) => {
  if (txIn == null) {
    console.log('txIn is null');
    return false;
  } else if (typeof txIn.signature !== 'string') {
    console.log('invalid signature type in txIn');
    return false;
  } else if (typeof txIn.txOutId !== 'string') {
    console.log('invalid txOutId type in txIn');
    return false;
  } else if (typeof txIn.txOutIndex !== 'number') {
    console.log('invalid txOutIndex type in txIn');
    return false;
  } else {
    return true;
  }
};

const isValidTxOutStructure = (txOut) => {
  if (txOut == null) {
    console.log('txOut is null');
    return false;
  } else if (typeof txOut.address !== 'string') {
    console.log('invalid address type in txOut');
    return false;
  } else if (!isValidAddress(txOut.address)) {
    console.log('invalid TxOut address');
    return false;
  } else if (typeof txOut.amount !== 'number') {
    console.log('invalid amount type in txOut');
    return false;
  } else {
    return true;
  }
};

const isValidTransactionStructure = (transaction) => {
  if (typeof transaction.id !== 'string') {
    console.log('transactionId missing');
    return false;
  }
  if (!(transaction.txIns instanceof Array)) {
    console.log('invalid txIns type in transaction');
    return false;
  }
  if (!transaction.txIns
    .map(isValidTxInStructure)
    .reduce((a, b) => (a && b), true)) {
    return false;
  }
  if (!(transaction.txOuts instanceof Array)) {
    console.log('invalid txIns type in transaction');
    return false;
  }
  return transaction.txOuts
    .map(isValidTxOutStructure)
    .reduce((a, b) => (a && b), true);
};

const getTransactionId = (transaction) => {
  const txInContent = transaction.txIns
    .map((txIn) => txIn.txOutId + txIn.txOutIndex)
    .reduce((a, b) => a + b, '');
  const txOutContent = transaction.txOuts
    .map((txOut) => txOut.address + txOut.amount)
    .reduce((a, b) => a + b, '');
  return sha256EncryptedString(txInContent + txOutContent);
};

const hasDuplicates = (txIns) => {
  const groups = _.countBy(txIns, (txIn) => txIn.txOutId + txIn.txOutIndex);
  return _(groups)
    .map((value, key) => {
      if (value > 1) {
        console.log('duplicate txIn: ' + key);
        return true;
      } else {
        return false;
      }
    })
    .includes(true);
};

const validateCoinbaseTx = (transaction, blockIndex) => {
  if (transaction == null) {
    console.log('the first transaction in the block must be coinbase transaction');
    return false;
  }
  if (getTransactionId(transaction) !== transaction.id) {
    console.log('invalid coinbase tx id: ' + transaction.id);
    return false;
  }
  if (transaction.txIns.length !== 1) {
    console.log('one txIn must be specified in the coinbase transaction');
    return;
  }
  if (transaction.txIns[0].txOutIndex !== blockIndex) {
    console.log('the txIn signature in coinbase tx must be the block height');
    return false;
  }
  if (transaction.txOuts.length !== 1) {
    console.log('invalid number of txOuts in coinbase transaction');
    return false;
  }
  if (transaction.txOuts[0].amount !== COINBASE_AMOUNT) {
    console.log('invalid coinbase amount in coinbase transaction');
    return false;
  }
  return true;
};

const checkTransactionRequest = (address, amount) => {
  if (address === undefined || amount === undefined) throw Error('invalid address or amount');
};

module.exports = {
  getTransactionId,
  isValidAddress,
  isValidTransactionStructure,
  validateCoinbaseTx,
  hasDuplicates,
  checkTransactionRequest
};
