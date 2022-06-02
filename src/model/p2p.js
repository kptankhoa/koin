const blockchain = require('./blockchain');
const transactionPool = require('./transactionPool');
const dataHandler = require('./dataHandler');
const WebSocket = require('ws');
const fs = require('fs');

const MessageType = {
  QUERY_LATEST: 0,
  QUERY_ALL: 1,
  RESPONSE_BLOCKCHAIN: 2,
  QUERY_TRANSACTION_POOL: 3,
  RESPONSE_TRANSACTION_POOL: 4,
  QUERY_NODES: 5,
  RESPONSE_NODES: 6,
  NODE_ADDRESS: 7
};

let server;
let myNodeUrl = '';
function initP2PServer(port) {
  if (!server) {
    server = new WebSocket.Server({ port: port });
    server.on('connection', (ws, req) => {
      console.log('Connect to client ' + ws._socket.remoteAddress);
      initConnection(ws);
    });
    myNodeUrl = `ws://localhost:${port}`;
    console.log('Websoket server is running at port: ' + port);
  }
  return server;
}
exports.initP2PServer = initP2PServer;

function getSockets() {
  return [...server.clients];
}
exports.getSockets = getSockets;


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

/* ------------ Send message --------------*/
function write(ws, message) {
  console.log('message', JSON.stringify(message));
  ws.send(JSON.stringify(message));
}

function broadcast(message) {
  server.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      write(client, message);
    }
  });
}

function broadcastLatest() {
  broadcast(responseLatestMsg());
}
exports.broadcastLatest=broadcastLatest;


function broadcastTransactionPool() {
  broadcast(responseTransactionPoolMsg());
}
exports.broadcastTransactionPool = broadcastTransactionPool;

/*------------- Query message -------------*/
function queryChainLengthMsg() {
  return { type: MessageType.QUERY_LATEST, data: null };
}

function queryAllMsg() {
  return { type: MessageType.QUERY_ALL, data: null };
}

function queryTransactionPoolMsg() {
  return { type: MessageType.QUERY_TRANSACTION_POOL, data: null };
}

function nodeUrlMsg() {
  return { type: MessageType.NODE_ADDRESS, data: myNodeUrl };
}


/*------------  Response message -----------*/
function responseLatestMsg() {
  const latestBlock = blockchain.getLatestBlock();
  return {
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: JSON.stringify([latestBlock])
  };
}

function responseChainMsg() {
  return {
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: JSON.stringify(blockchain.getBlockchain())
  };
}

function responseTransactionPoolMsg() {
  return {
    type: MessageType.RESPONSE_TRANSACTION_POOL,
    data: JSON.stringify(transactionPool.getTransactionPool())
  };
}

function handleBlockChainResponse(receivedBlocks) {
  console.log('Handling block response...');
  if (receivedBlocks.length === 0) {
    console.log('Received block chain size of 0');
    return;
  }
  const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
  if (!blockchain.isValidBlockStructure(latestBlockReceived)) {
    console.log('Block structure not valid');
    return;
  }
  const latestBlockHeld = blockchain.getLatestBlock();
  if (latestBlockReceived.index > latestBlockHeld.index) {
    console.log('blockchain possibly behind. We got: '
            + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
    if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
      if (blockchain.addBlockToChain(latestBlockReceived)) {
        console.log('Add new block to chain successfully!');
        dataHandler.rewriteChain(blockchain.getBlockchain());
        console.log('Broadcast to response new block to network');
        broadcast(responseLatestMsg());
      }
    } else if (receivedBlocks.length === 1) {
      // console.log("We have to query the chain from our peer");
      console.log('Broadcast to query new blockchain to network');
      broadcast(queryAllMsg());
    } else {
      console.log('Received blockchain is longer than current blockchain');
      blockchain.replaceChain(receivedBlocks);
      console.log('Replace blockchain successfully!');
      dataHandler.rewriteChain(blockchain.getBlockchain());

    }
  } else {
    console.log('Received blockchain is not longer than your blockchain. Do nothing');
  }
}

const connectedNodeUrls = [];

function isConnectedToNode(url) {
  return !!connectedNodeUrls.find(node => node === url);
}

function connectToPeer(url) {
  const ws = new WebSocket(url);

  ws.on('open', () => {
    write(ws, nodeUrlMsg());
    initConnection(ws);
    //Save connected node url
    connectedNodeUrls.push(url);
  });

  ws.on('close', () => {
    console.log(`Socket close on ${url}`);
    for (let i = 0; i < connectedNodeUrls.length; i++) {
      if (connectedNodeUrls[i] === url) {
        connectedNodeUrls.splice(i, 1);
        break;
      }
    }
  });

  ws.on('error', () => {
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

