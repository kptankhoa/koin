const authRouter = require('./auth.route');
const chainRouter = require('./chain.route');
const transactionRouter = require('./transaction.route');
const poolRouter = require('./pool.route');
const walletRouter = require('./wallet.route');
const p2pRouter = require('./p2p.route');

const wallet = require('../controller/wallet');
const blockchain = require('../controller/blockchain');
const transactionPool = require('../controller/transactionPool');

const routes = (app) => {
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

};

module.exports = routes;
