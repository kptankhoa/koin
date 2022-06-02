const ws = require('ws');
const blockchain = require('../controller/blockchain');
const transactionPool = require('../controller/transactionPool');
const dataHandler = require('./data.util');
const { MessageType } = require('../constants/p2p.const');

// server
let server;
const getNewServer = (port) => {
  server = new ws.WebSocket.Server({ port: port });
};
const getServer = () => server;

//query message
function queryChainLengthMsg() {
  return { type: MessageType.QUERY_LATEST, data: null };
}

function queryAllMsg() {
  return { type: MessageType.QUERY_ALL, data: null };
}

function queryTransactionPoolMsg() {
  return { type: MessageType.QUERY_TRANSACTION_POOL, data: null };
}

function nodeUrlMsg(nodeUrl) {
  return { type: MessageType.NODE_ADDRESS, data: nodeUrl };
}

// response message

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

// send message
function write(ws, message) {
  console.log('message', JSON.stringify(message));
  ws.send(JSON.stringify(message));
}

function broadcast(message) {
  server.clients.forEach(client => {
    if (client.readyState === ws.WebSocket.OPEN) {
      write(client, message);
    }
  });
}

// handle response
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

module.exports = {
  getNewServer,
  getServer,
  write,
  broadcast,
  nodeUrlMsg,
  queryChainLengthMsg,
  queryAllMsg,
  queryTransactionPoolMsg,
  responseLatestMsg,
  responseChainMsg,
  responseTransactionPoolMsg,
  handleBlockChainResponse
};
