const ecdsa = require('elliptic');
const _ = require('lodash');
const { toHexString } = require('../utils/string.util');
const { Transaction, TxIn, TxOut, UnspentTxOut } = require('../model/transaction');
const { isValidTransactionStructure, getTransactionId, validateCoinbaseTx, hasDuplicates } = require('../utils/transaction.util');
const { getPublicKey } = require('../utils/key.util');
const { COINBASE_AMOUNT } = require('../constants/blockchain.const');
const ec = new ecdsa.ec('secp256k1');

const findUnspentTxOut = (transactionId, index, aUnspentTxOuts) => {
  return aUnspentTxOuts.find((uTxO) => uTxO.txOutId === transactionId && uTxO.txOutIndex === index);
};

const getTxInAmount = (txIn, aUnspentTxOuts) => {
  return findUnspentTxOut(txIn.txOutId, txIn.txOutIndex, aUnspentTxOuts).amount;
};

const validateTxIn = (txIn, transaction, aUnspentTxOuts) => {
  const referencedUTxOut = aUnspentTxOuts.find((uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex);
  if (referencedUTxOut == null) {
    console.log('referenced txOut not found: ' + JSON.stringify(txIn));
    return false;
  }
  const address = referencedUTxOut.address;
  const key = ec.keyFromPublic(address, 'hex');
  const validSignature = key.verify(transaction.id, txIn.signature);
  if (!validSignature) {
    console.log('invalid txIn signature: %s txId: %s address: %s', txIn.signature, transaction.id, referencedUTxOut.address);
    return false;
  }
  return true;
};

const validateTransaction = (transaction, aUnspentTxOuts) => {
  if (!isValidTransactionStructure(transaction)) {
    return false;
  }
  if (getTransactionId(transaction) !== transaction.id) {
    console.log('invalid tx id: ' + transaction.id);
    return false;
  }
  const hasValidTxIns = transaction.txIns
    .map((txIn) => validateTxIn(txIn, transaction, aUnspentTxOuts))
    .reduce((a, b) => a && b, true);
  if (!hasValidTxIns) {
    console.log('some of the txIns are invalid in tx: ' + transaction.id);
    return false;
  }
  const totalTxInValues = transaction.txIns
    .map((txIn) => getTxInAmount(txIn, aUnspentTxOuts))
    .reduce((a, b) => (a + b), 0);
  const totalTxOutValues = transaction.txOuts
    .map((txOut) => txOut.amount)
    .reduce((a, b) => (a + b), 0);
  if (totalTxOutValues !== totalTxInValues) {
    console.log('totalTxOutValues !== totalTxInValues in tx: ' + transaction.id);
    return false;
  }
  return true;
};
exports.validateTransaction = validateTransaction;

const validateBlockTransactions = (aTransactions, aUnspentTxOuts, blockIndex) => {
  const coinbaseTx = aTransactions[0];
  if (!validateCoinbaseTx(coinbaseTx, blockIndex)) {
    console.log('invalid coinbase transaction: ' + JSON.stringify(coinbaseTx));
    return false;
  }
  //check for duplicate txIns. Each txIn can be included only once
  const txIns = _(aTransactions)
    .map(tx => tx.txIns)
    .flatten()
    .value();
  if (hasDuplicates(txIns)) {
    return false;
  }
  // all but coinbase transactions
  const normalTransactions = aTransactions.slice(1);
  return normalTransactions.map((tx) => validateTransaction(tx, aUnspentTxOuts))
    .reduce((a, b) => (a && b), true);
};

const getCoinbaseTransaction = (address, blockIndex) => {
  const t = new Transaction();
  const txIn = new TxIn();
  txIn.signature = '';
  txIn.txOutId = '';
  txIn.txOutIndex = blockIndex;
  t.txIns = [txIn];
  t.txOuts = [new TxOut(address, COINBASE_AMOUNT)];
  t.id = getTransactionId(t);
  return t;
};
exports.getCoinbaseTransaction = getCoinbaseTransaction;

const signTxIn = (transaction, txInIndex, privateKey, aUnspentTxOuts) => {
  const txIn = transaction.txIns[txInIndex];
  const dataToSign = transaction.id;
  const referencedUnspentTxOut = findUnspentTxOut(txIn.txOutId, txIn.txOutIndex, aUnspentTxOuts);
  if (referencedUnspentTxOut == null) {
    console.log('could not find referenced txOut');
    throw Error();
  }
  const referencedAddress = referencedUnspentTxOut.address;
  if (getPublicKey(privateKey) !== referencedAddress) {
    console.log('trying to sign an input with private key that does not match the address that is referenced in txIn');
    throw Error();
  }
  const key = ec.keyFromPrivate(privateKey, 'hex');
  return toHexString(key.sign(dataToSign).toDER()); //signature
};
exports.signTxIn = signTxIn;

const updateUnspentTxOuts = (newTransactions, aUnspentTxOuts) => {
  const newUnspentTxOuts = newTransactions
    .map((t) => {
      return t.txOuts.map((txOut, index) => new UnspentTxOut(t.id, index, txOut.address, txOut.amount));
    })
    .reduce((a, b) => a.concat(b), []);
  const consumedTxOuts = newTransactions
    .map((t) => t.txIns)
    .reduce((a, b) => a.concat(b), [])
    .map((txIn) => new UnspentTxOut(txIn.txOutId, txIn.txOutIndex, '', 0));
  return aUnspentTxOuts
    .filter(((uTxO) => !findUnspentTxOut(uTxO.txOutId, uTxO.txOutIndex, consumedTxOuts)))
    .concat(newUnspentTxOuts);
};

const processTransactions = (aTransactions, aUnspentTxOuts, blockIndex) => {
  if (!validateBlockTransactions(aTransactions, aUnspentTxOuts, blockIndex)) {
    console.log('invalid block transactions');
    return null;
  }
  return updateUnspentTxOuts(aTransactions, aUnspentTxOuts);
};
exports.processTransactions = processTransactions;

const getTransactionById = (txId, blockchain) => {
  return _(blockchain)
    .map((blocks) => blocks.data)
    .flatten()
    .find({ 'id': txId });
};
exports.getTransactionById = getTransactionById;

function getBlockIncludeTx(transaction, chain) {
  for (const block of chain) {
    for (let i = 0; i < block.data.length; i++) {
      if (block.data[i].id === transaction.id) {
        return { index: block.index, hash: block.hash };
      }
    }
  }
  return null;
}
exports.getBlockIncludeTx = getBlockIncludeTx;

function getTxInsAddresses(tx, chain) {
  let res = [];
  for (const txIn of tx.txIns) {
    if (txIn.txOutId === '')
      res.push({
        address: 'COINBASE',
        amount: 50
      });
    else {
      let newId = txIn.txOutId;
      let index = txIn.txOutIndex;
      res.push(getTransactionById(newId, chain).txOuts[index]);
    }
  }
  return res;
}
exports.getTxInsAddresses = getTxInsAddresses;

const getTxsRelated = (publicKey, blockchain = []) => {
  const key = ec.keyFromPublic(publicKey, 'hex');
  let totalSent = 0;
  let totalReceived = 0;
  let historyTxs = [];
  const allTransaction = _(blockchain).map(block => block.data).flatten();
  for (const tx of allTransaction) {
    if (tx.txIns[0].signature && key.verify(tx.id, tx.txIns[0].signature)) {
      totalSent += tx.txOuts[0].amount;
      const txInfo = {
        hash: tx.id,
        type: 'Sent',
        amount: tx.txOuts[0].amount
      };
      historyTxs.push(txInfo);
    }
    if (tx.txOuts[0].address === publicKey) {
      totalReceived += tx.txOuts[0].amount;
      const txInfo = {
        hash: tx.id,
        type: 'Received',
        amount: tx.txOuts[0].amount
      };
      historyTxs.push(txInfo);
    }
  }

  return ({
    publicKey,
    totalReceived,
    totalSent,
    historyTxs
  });
};
exports.getTxsRelated = getTxsRelated;
