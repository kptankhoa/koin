const Router = require('express').Router;
const p2p = require('../controller/p2p');

const router = new Router();

router.get('/', (req, res) => {
  res.json(p2p.getSockets().map((s) => s._socket.remoteAddress + ':' + s._socket.remotePort));
});

router.post('/addPeer', (req, res) => {
  p2p.connectToPeers(req.body.peer);
  res.json();
});

module.exports = router;
