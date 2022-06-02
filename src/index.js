const express = require('express');
const timeout = require('connect-timeout');
const session = require('express-session');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const _ = require('lodash');
const fs = require('fs');

require('express-async-errors');
const blockchain = require('./model/blockchain');
const p2p = require('./model/p2p');
const transactionPool = require('./model/transactionPool');
const wallet = require('./model/wallet');
const transaction = require('./model/transaction');

const authRouter = require('./route/auth.router');

const httpPort = parseInt(process.env.HTTP_PORT) || 3001;
const p2pPort = parseInt(process.env.P2P_PORT) || 6001;

const initHttpServer = (myHttpPort) => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('dev'));
  app.use(cors());
  app.use(session({secret: 'not a secret', resave: true, saveUninitialized: true}));
  app.use(timeout(3000));

  app.use('/auth', authRouter);

  app.post('/signup', (req, res) => {
    const keyPair = wallet.registerNewWallet();
    res.json(keyPair);
  });
  app.post('/signin', (req, res) => {
    const {privateKey} = req.body;
    if (wallet.isKeyExist(privateKey)) {
      if (!req.session.user) {
        req.session.user = {};
      }
      fs.writeFileSync('node/wallet/private_key', privateKey);
      const publicKey = wallet.getWalletFromPrivate(privateKey);
      req.session.user = {...publicKey};
      //redirect to user wallet
      return res.json({
        publicKey: publicKey,
        balance: blockchain.getAccountBalance()
      });
    }
    //redirect to login page
    else {
      res.status(400).json(
        {error_message: 'Key not found!'}
      );
    }
  });

  app.get('/getWalletData', (req, res) => {
    const publicKey = wallet.getPublicFromWallet();
    const balance = blockchain.getAccountBalance();
    const txPool = transactionPool.getTransactionPool();
    res.json({publicKey, balance, txPool});
  });
  app.get('/getExplorerData', (req, res) => {
    const txPool = transactionPool.getTransactionPool();
    const chain = blockchain.getBlockchain();
    res.json({txPool, chain});
  });
  app.get('/blocks', (req, res) => {
    res.json(blockchain.getBlockchain());
  });
  app.get('/block/:hash', (req, res) => {
    const block = _.find(blockchain.getBlockchain(), {'hash': req.params.hash});
    res.json(block);
  });
  app.get('/transaction/:id', (req, res) => {
    const tx = transaction.getTransactionById(req.params.id, blockchain.getBlockchain());
    const txInsData = transaction.getTxInsAddresses(tx, blockchain.getBlockchain());
    const blockInclude = transaction.getBlockIncludeTx(tx, blockchain.getBlockchain());
    res.json({tx, txInsData, blockInclude});
  });
  app.get('/address/:address', (req, res) => {
    const txsRelated = wallet.getTxsRelated(req.params.address, blockchain.getBlockchain());
    const finalBalance = wallet.getBalance(req.params.address, blockchain.getUnspentTxOuts());
    res.json({txsRelated, finalBalance});
  });
  app.get('/unspentTransactionOutputs', (req, res) => {
    res.json(blockchain.getUnspentTxOuts());
  });
  app.get('/myUnspentTransactionOutputs', (req, res) => {
    res.json(blockchain.getMyUnspentTransactionOutputs());
  });
  app.post('/mineRawBlock', (req, res) => {
    if (req.body.data == null) {
      res.json('data parameter is missing');
      return;
    }
    const newBlock = blockchain.generateRawNextBlock(req.body.data);
    if (newBlock === null) {
      res.status(400).json({error_message: 'could not generate block'});
    } else {
      res.json(newBlock);
    }
  });
  app.post('/mineBlock', (req, res) => {
    let newBlock;
    try {
      newBlock = blockchain.generateNextBlock();
    } catch (e) {
      console.log(e.message);
      res.status(400).json({error_message: e.message});
    }
    if (newBlock === null) {
      res.status(400).json({error_message: 'Could not generate block'});
    } else {
      res.json(newBlock);
    }
  });
  app.get('/balance', (req, res) => {
    const balance = blockchain.getAccountBalance();
    res.json({'balance': balance});
  });
  app.get('/address', (req, res) => {
    const address = wallet.getPublicFromWallet();
    res.json({'address': address});
  });
  app.post('/mineTransaction', (req, res) => {
    const address = req.body.address;
    const amount = req.body.amount;
    try {
      const resp = blockchain.generateNextBlockWithTransaction(address, amount);
      res.json(resp);
    } catch (e) {
      console.log(e.message);
      res.status(400).json({error_message: e.message});
    }
  });
  app.post('/sendTransaction', (req, res) => {
    try {
      const address = req.body.address;
      const amount = req.body.amount;
      if (address === undefined || amount === undefined) {
        throw Error('invalid address or amount');
      }
      const resp = blockchain.sendTransaction(address, amount);
      res.json(resp);
    } catch (e) {
      console.log(e.message);
      res.status(400).json({error_message: e.message});
    }
  });
  app.get('/transactionPool', (req, res) => {
    res.json(transactionPool.getTransactionPool());
  });
  app.get('/transactionPool/:id', (req, res) => {
    const tx = _(transactionPool.getTransactionPool())
      .find({'id': req.params.id});
    const txInsData = transaction.getTxInsAddresses(tx, blockchain.getBlockchain());
    res.json({tx, txInsData});
  });
  app.get('/peers', (req, res) => {
    res.json(p2p.getSockets().map((s) => s._socket.remoteAddress + ':' + s._socket.remotePort));
  });
  app.post('/addPeer', (req, res) => {
    p2p.connectToPeers(req.body.peer);
    res.json();
  });
  app.post('/stop', (req, res) => {
    res.json({'msg': 'stopping server'});
    process.exit();
  });

  app.use(function (req, res) {
    res.status(404).json({
      error_message: 'Endpoint not found'
    });
  });

  app.use(function (err, req, res) {
    console.error(err.stack);
    res.status(500).json({
      error_message: 'Something broke!'
    });
  });

  app.use((err, req, res) => {
    if (err) {
      res.status(400).send(err.message);
    }
  });

  app.listen(myHttpPort, () => {
    console.log('Listening http on port: ' + myHttpPort);
  });
};

initHttpServer(httpPort);
p2p.initP2PServer(p2pPort);
wallet.initWallet();

p2p.connectToPeers();
