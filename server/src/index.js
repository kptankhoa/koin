require('express-async-errors');

const p2p = require('./controller/p2p');
const wallet = require('./controller/wallet');

const createServer = require('./utils/server.util');

const httpPort = parseInt(process.env.PORT) || 3001;
const p2pPort = parseInt(process.env.P2P_PORT) || 6001;

const initHttpServer = (myHttpPort) => {
  const app = createServer();

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
