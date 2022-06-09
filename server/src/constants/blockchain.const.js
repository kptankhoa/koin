const Block = require('../model/block');

const COINBASE_AMOUNT = 50;

// in seconds
const BLOCK_GENERATION_INTERVAL = 10;
// in blocks
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10;

const genesisTransaction = {
  'txIns': [{ 'signature': '', 'txOutId': '', 'txOutIndex': 0 }],
  'txOuts': [{
    'address': '04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534a',
    'amount': 50
  }],
  'id': 'e655f6a5f26dc9b4cac6e46f52336428287759cf81ef5ff10854f69d68f43fa3'
};
const genesisBlock = new Block(0, 'a6737751dabaaafd8a080bdd793a77b33b83bcb6501450be77929b23b6f551b9', '', 1654501784, [genesisTransaction], 5, 0);

module.exports = {
  COINBASE_AMOUNT,
  BLOCK_GENERATION_INTERVAL,
  DIFFICULTY_ADJUSTMENT_INTERVAL,
  genesisBlock
};
