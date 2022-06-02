const express = require('express');
const timeout = require('connect-timeout');
const session = require('express-session');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('express-async-errors');

const blockchain = require('./controller/blockchain');
const p2p = require('./controller/p2p');
const transactionPool = require('./controller/transactionPool');
const wallet = require('./controller/wallet');

const authRouter = require('./route/auth.route');
const chainRouter = require('./route/chain.route');
const transactionRouter = require('./route/transaction.route');
const poolRouter = require('./route/pool.route');
const walletRouter = require('./route/wallet.route');
const p2pRouter = require('./route/p2p.route');

const httpPort = parseInt(process.env.HTTP_PORT) || 3001;
const p2pPort = parseInt(process.env.P2P_PORT) || 6001;

const initHttpServer = (myHttpPort) => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('dev'));
  app.use(cors());
  app.use(session({ secret: 'not a secret', resave: true, saveUninitialized: true }));
  app.use(timeout(3000));

  app.use('/auth', authRouter);
  app.use('/chain', chainRouter);
  app.use('/transactions', transactionRouter);
  app.use('/transactionPool', poolRouter);
  app.use('/wallet', walletRouter);
  app.use('/peers', p2pRouter);

  app.get('/getWalletData', (req, res) => {
    const publicKey = wallet.getPublicFromWallet();
    const balance = blockchain.getAccountBalance();
    const txPool = transactionPool.getTransactionPool();
    res.json({ publicKey, balance, txPool });
  });

  app.get('/getExplorerData', (req, res) => {
    const txPool = transactionPool.getTransactionPool();
    const chain = blockchain.getBlockchain();
    res.json({ txPool, chain });
  });

  app.post('/stop', (req, res) => {
    res.json({ 'msg': 'stopping server' });
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
