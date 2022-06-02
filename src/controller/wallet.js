const elliptic = require('elliptic');
const fs = require('fs');
const _ = require('lodash');
const blockchain = require('./blockchain');
const transaction = require('./transaction');
const dataHandler = require('../utils/data.util');
const EC = new elliptic.ec('secp256k1');
const { PRIVATE_KEY_PATH } = require('../constants/paths.const');
const { getPublicKey } = require('../utils/key.util');
const { TxIn, Transaction, TxOut } = require('../model/transaction');
const { getTransactionId } = require('../utils/transaction.util');

const getPrivateFromWallet = () => {
  const buffer = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  return buffer.toString();
};
exports.getPrivateFromWallet = getPrivateFromWallet;

const getPublicFromWallet = () => {
  const privateKey = getPrivateFromWallet();
  const key = EC.keyFromPrivate(privateKey, 'hex');
  return key.getPublic().encode('hex');
};
exports.getPublicFromWallet = getPublicFromWallet;

const registerNewWallet = () => {
  const keyPair = EC.genKeyPair();
  const privateKey = keyPair.getPrivate().toString(16);
  const publicKey = keyPair.getPublic().encode('hex');
  blockchain.sendRegisterRwBlock(publicKey);
  dataHandler.addKey({ privateKey, publicKey });
  return { privateKey, publicKey };
};
exports.registerNewWallet = registerNewWallet;

const isKeyExist = (privateKey) => {
  const keys = dataHandler.getKeys();
  for (const key of keys) {
    if (key.privateKey === privateKey)
      return true;
  }
  return false;
};
exports.isKeyExist = isKeyExist;

const getWalletFromPrivate = (privateKey) => {
  const key = EC.keyFromPrivate(privateKey, 'hex');
  return key.getPublic().encode('hex');
};
exports.getWalletFromPrivate = getWalletFromPrivate;

const initWallet = () => {
  // let's not override existing private keys
  if (fs.existsSync(PRIVATE_KEY_PATH)) {
    return;
  }
  const newKeyPair = registerNewWallet();
  fs.writeFileSync(PRIVATE_KEY_PATH, newKeyPair.privateKey);
  console.log('New wallet with private key created to : %s', newKeyPair.privateKey);
};
exports.initWallet = initWallet;

const deleteWallet = () => {
  if (fs.existsSync(PRIVATE_KEY_PATH)) {
    fs.unlinkSync(PRIVATE_KEY_PATH);
  }
};
exports.deleteWallet = deleteWallet;

const getBalance = (address, unspentTxOuts) => {
  return _(unspentTxOuts)
    .filter((uTxO) => uTxO.address === address)
    .map((uTxO) => uTxO.amount)
    .sum();
};
exports.getBalance = getBalance;

const findUnspentTxOuts = (ownerAddress, unspentTxOuts) => {
  return _.filter(unspentTxOuts, (uTxO) => uTxO.address === ownerAddress);
};
exports.findUnspentTxOuts = findUnspentTxOuts;

const findTxOutsForAmount = (amount, myUnspentTxOuts) => {
  let currentAmount = 0;
  const includedUnspentTxOuts = [];
  for (const myUnspentTxOut of myUnspentTxOuts) {
    includedUnspentTxOuts.push(myUnspentTxOut);
    currentAmount = currentAmount + myUnspentTxOut.amount;
    if (currentAmount >= amount) {
      const leftOverAmount = currentAmount - amount;
      return { includedUnspentTxOuts, leftOverAmount };
    }
  }
  const error_message = 'Cannot create transaction from the available unspent transaction outputs.' +
    ' Required amount:' + amount + '. Available unspentTxOuts:' + JSON.stringify(myUnspentTxOuts);
  throw Error(error_message);
};

const createTxOuts = (receiverAddress, myAddress, amount, leftOverAmount) => {
  const txOut1 = new TxOut(receiverAddress, amount);
  if (leftOverAmount === 0) {
    return [txOut1];
  } else {
    const leftOverTx = new TxOut(myAddress, leftOverAmount);
    return [txOut1, leftOverTx];
  }
};

const filterTxPoolTxs = (unspentTxOuts, transactionPool) => {
  const txIns = _(transactionPool)
    .map((tx) => tx.txIns)
    .flatten()
    .value();
  const removable = [];
  for (const unspentTxOut of unspentTxOuts) {
    const txIn = _.find(txIns, (aTxIn) => {
      return aTxIn.txOutIndex === unspentTxOut.txOutIndex && aTxIn.txOutId === unspentTxOut.txOutId;
    });
    if (txIn !== undefined) {
      removable.push(unspentTxOut);
    }
  }
  return _.without(unspentTxOuts, ...removable);
};

const createTransaction = (receiverAddress, amount, privateKey, unspentTxOuts, txPool) => {
  console.log('txPool: %s', JSON.stringify(txPool));
  const myAddress = getPublicKey(privateKey);
  const myUnspentTxOutsA = unspentTxOuts.filter((uTxO) => uTxO.address === myAddress);
  console.log({ before: myUnspentTxOutsA });
  const myUnspentTxOuts = filterTxPoolTxs(myUnspentTxOutsA, txPool);
  console.log({ after: myUnspentTxOuts });
  // filter from unspentOutputs such inputs that are referenced in pool
  const { includedUnspentTxOuts, leftOverAmount } = findTxOutsForAmount(amount, myUnspentTxOuts);
  const toUnsignedTxIn = (unspentTxOut) => {
    const txIn = new TxIn();
    txIn.txOutId = unspentTxOut.txOutId;
    txIn.txOutIndex = unspentTxOut.txOutIndex;
    return txIn;
  };
  const unsignedTxIns = includedUnspentTxOuts.map(toUnsignedTxIn);
  const tx = new Transaction();
  tx.txIns = unsignedTxIns;
  tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);
  tx.id = getTransactionId(tx);
  tx.txIns = tx.txIns.map((txIn, index) => {
    txIn.signature = transaction.signTxIn(tx, index, privateKey, unspentTxOuts);
    return txIn;
  });
  return tx;
};
exports.createTransaction = createTransaction;

