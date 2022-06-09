const blockchain = require('../controller/blockchain');
const transaction = require('../controller/transaction');
const wallet = require('../controller/wallet');
const Router = require('express').Router;

const router = new Router();

router.get('/:id', (req, res) => {
  const tx = transaction.getTransactionById(req.params.id, blockchain.getBlockchain());
  const txInsData = transaction.getTxInsAddresses(tx, blockchain.getBlockchain());
  const blockInclude = transaction.getBlockIncludeTx(tx, blockchain.getBlockchain());
  res.json({ tx, txInsData, blockInclude });
});

router.get('/address/:address', (req, res) => {
  const txsRelated = transaction.getTxsRelated(req.params.address, blockchain.getBlockchain());
  const finalBalance = wallet.getBalance(req.params.address, blockchain.getUnspentTxOuts());
  res.json({ txsRelated, finalBalance });
});

module.exports = router;
