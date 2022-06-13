const blockchain = require('./blockchain');
const ws = require('ws');
const fs = require('fs');
const {
  getNewServer, getServer, nodeUrlMsg, write, queryChainLengthMsg, broadcast, queryTransactionPoolMsg,
  responseLatestMsg, responseChainMsg, handleBlockChainResponse, responseTransactionPoolMsg
} = require('../utils/p2p.util');

let server = getServer();
const { MessageType } = require('../constants/p2p.const');

let myNodeUrl = '';
const connectedNodeUrls = [];

function isConnectedToNode(url) {
  return !!connectedNodeUrls.find(node => node === url);
}

function broadcastLatest() {
  broadcast(responseLatestMsg());
}
exports.broadcastLatest=broadcastLatest;

function broadcastTransactionPool() {
  broadcast(responseTransactionPoolMsg());
}
exports.broadcastTransactionPool = broadcastTransactionPool;

function initMessageHandler(ws) {
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      if (message === null) {
        console.log('Could not parse received JSON message: ' + data);
        return;
      }
      console.log('Received message: ' + JSON.stringify(message));
      switch (message.type) {
      case MessageType.QUERY_LATEST:
        console.log('Response latest block to ' + ws.url);
        write(ws, responseLatestMsg());
        break;
      case MessageType.QUERY_ALL:
        console.log('Response blockchain to ' + ws.url);
        write(ws, responseChainMsg());
        break;
      case MessageType.RESPONSE_BLOCKCHAIN:
        const receivedBlocks = JSON.parse(message.data);
        if (receivedBlocks === null) {
          console.log('Invalid blocks received:');
          console.log(message.data);
          break;
        }
        handleBlockChainResponse(receivedBlocks);
        break;
      case MessageType.QUERY_TRANSACTION_POOL:
        write(ws, responseTransactionPoolMsg());
        break;
      case MessageType.RESPONSE_TRANSACTION_POOL:
        const receivedTransactionPool = JSON.parse(message.data);
        if (receivedTransactionPool === null) {
          console.log('Invalid transaction received: ' + JSON.parse(message.data));
          break;
        }
        receivedTransactionPool.forEach(transaction => {
          try {
            blockchain.handleReceivedTransaction(transaction);
            // if no error is thrown, transaction was indeed added to the pool
            // let's broadcast transaction pool
            broadcastTransactionPool();
          } catch (e) {
            console.log(e.message);
          }
        });
        break;
      case MessageType.NODE_ADDRESS:
        const remoteAddress = message.data;
        if (!isConnectedToNode(remoteAddress)) {
          // eslint-disable-next-line no-use-before-define
          connectToPeer(remoteAddress);
        }
        break;
      default:
        console.log('Message type not found!');
        break;
      }
    } catch (error) {
      console.log('error in function initMessageHandler!', error);
      // throw new Error()
    }
  });
}

function initErrorHandler(ws) {
  function closeConnection(websocket) {
    console.log('Disconnect to peer: ' + websocket.url);
    // sockets.splice(sockets.indexOf(websocket), 1);
  }

  ws.on('close', () => closeConnection(ws));
  ws.on('error', () => closeConnection(ws));
}

function initConnection(ws) {
  initMessageHandler(ws);
  initErrorHandler(ws);

  console.log('Send message to query latest block');
  write(ws, queryChainLengthMsg());

  setTimeout(() => {
    console.log('Send message to query transaction pool');
    broadcast(queryTransactionPoolMsg());
  }, 500);
}

function initP2PServer(port) {
  if (!server) {
    getNewServer(port);
    server = getServer();
    server.on('connection', (ws) => {
      console.log('Connect to client ' + ws._socket.remoteAddress);
      initConnection(ws);
    });
    myNodeUrl = `ws://localhost:${port}`;
    console.log('Websoket server is running at port: ' + port);
  }
  return server;
}
exports.initP2PServer = initP2PServer;

function closeServer() {
  if (!server) {
    return;
  }
  server.close();
}
exports.closeServer = closeServer;

function getSockets() {
  return [...server.clients];
}
exports.getSockets = getSockets;

function connectToPeer(url) {
  const peerWS = new ws.WebSocket(url);

  peerWS.on('open', () => {
    write(peerWS, nodeUrlMsg(myNodeUrl));
    initConnection(peerWS);
    //Save connected node url
    connectedNodeUrls.push(url);
  });

  peerWS.on('close', () => {
    console.log(`Socket close on ${url}`);
    for (let i = 0; i < connectedNodeUrls.length; i++) {
      if (connectedNodeUrls[i] === url) {
        connectedNodeUrls.splice(i, 1);
        break;
      }
    }
  });

  peerWS.on('error', () => {
    console.log(`Socket error on ${url}`);
  });
}

function connectToPeers() {
  const jsonString = fs.readFileSync('./data/host.json').toString();
  if (jsonString.trim()) {
    const hosts = JSON.parse(jsonString);
    for (const host of hosts) {
      if (host === myNodeUrl) continue;
      console.log(`Connecting to ${host}...`);
      connectToPeer(host);
    }
  }
}
exports.connectToPeers=connectToPeers;

