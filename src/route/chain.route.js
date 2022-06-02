const Router = require('express').Router;
const _ = require('lodash');
const blockchain = require('../controller/blockchain');

const router = new Router();

router.get('/', (req, res) => {
  res.json(blockchain.getBlockchain());
});

router.get('/hash/:hash', (req, res) => {
  const block = _.find(blockchain.getBlockchain(), { 'hash': req.params.hash });
  if (!block) {
    res.status(404).json({
      error_message: 'Block not found!'
    });
  }
  res.json(block);
});

router.get('/unspentTransactionOutputs', (req, res) => {
  res.json(blockchain.getUnspentTxOuts());
});

router.post('/mineRawBlock', (req, res) => {
  if (req.body.data == null) {
    res.json('data parameter is missing');
    return;
  }
  const newBlock = blockchain.generateRawNextBlock(req.body.data);
  if (newBlock === null) {
    res.status(400).json({ error_message: 'could not generate block' });
  } else {
    res.json(newBlock);
  }
});

router.post('/mineBlock', (req, res) => {
  let newBlock;
  try {
    newBlock = blockchain.generateNextBlock();
  } catch (e) {
    console.log(e.message);
    res.status(400).json({ error_message: e.message });
  }
  if (newBlock === null) {
    res.status(400).json({ error_message: 'Could not generate block' });
  } else {
    res.json(newBlock);
  }
});

router.post('/mineTransaction', (req, res) => {
  const { address, amount } = req.body;
  try {
    const resp = blockchain.generateNextBlockWithTransaction(address, amount);
    res.json(resp);
  } catch (e) {
    console.log(e.message);
    res.status(400).json({ error_message: e.message });
  }
});

module.exports = router;
