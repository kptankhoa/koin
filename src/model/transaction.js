class UnspentTxOut {
  constructor(txOutId, txOutIndex, address, amount) {
    this.txOutId = txOutId;
    this.txOutIndex = txOutIndex;
    this.address = address;
    this.amount = amount;
  }
}

class TxIn {
}

class TxOut {
  constructor(address, amount) {
    this.address = address;
    this.amount = amount;
  }
}

class Transaction {
}

module.exports = {
  UnspentTxOut,
  TxIn,
  TxOut,
  Transaction
};
