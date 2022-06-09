const blockchain = require('../controller/blockchain');
const wallet = require('../controller/wallet');
const { checkTransactionRequest } = require('../utils/transaction.util');
const Router = require('express').Router;

const router = new Router();

router.get('/balance', (req, res) => {
  const balance = blockchain.getAccountBalance();
  res.json({ 'balance': balance });
});

router.get('/address', (req, res) => {
  const address = wallet.getPublicFromWallet();
  res.json({ 'address': address });
});

router.get('/myUnspentTransactionOutputs', (req, res) => {
  res.json(blockchain.getMyUnspentTransactionOutputs());
});

router.post('/sendTransaction', (req, res) => {
  try {
    const { address, amount } = req.body;
    checkTransactionRequest(address, amount);
    const resp = blockchain.sendTransaction(address, amount);
    res.json(resp);
  } catch (e) {
    console.log(e.message);
    res.status(400).json({ error_message: e.message });
  }
});

module.exports = router;
