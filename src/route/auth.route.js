const Router = require('express').Router;
const fs = require('fs');
const wallet = require('../controller/wallet');
const blockchain = require('../controller/blockchain');

const router = new Router();

router.post('/signup', (req, res) => {
  const keyPair = wallet.registerNewWallet();
  res.json(keyPair);
});

router.post('/signin', (req, res) => {
  const { privateKey } = req.body;
  if (wallet.isKeyExist(privateKey)) {
    if (!req.session.user) {
      req.session.user = {};
    }
    fs.writeFileSync('node/wallet/private_key', privateKey);
    const publicKey = wallet.getWalletFromPrivate(privateKey);
    req.session.user = { ...publicKey };
    //redirect to user wallet
    return res.json({
      publicKey: publicKey,
      balance: blockchain.getAccountBalance()
    });
  }
  else {
    res.status(400).json(
      { error_message: 'Key not found!' }
    );
  }
});

module.exports = router;
