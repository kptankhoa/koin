const Router = require('express').Router;
const transactionPool = require('../controller/transactionPool');
const _ = require('lodash');
const transaction = require('../controller/transaction');
const blockchain = require('../controller/blockchain');

const router = new Router();

router.get('/', (req, res) => {
  res.json(transactionPool.getTransactionPool());
});

router.get('/:id', (req, res) => {
  const tx = _(transactionPool.getTransactionPool())
    .find({ 'id': req.params.id });
  const txInsData = transaction.getTxInsAddresses(tx, blockchain.getBlockchain());
  res.json({ tx, txInsData });
});

module.exports = router;
