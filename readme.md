# KCoin
### Author: Khoa Phan
Based on [NaiveCoin](https://github.com/lhartikk/naivecoin)

## Installation
```
npm install
npm start
open '/mycoin-ui/index.html'
```

## API Usage:
### Get blockchain
```
curl http://localhost:3001/chain
```

### Mine a block
```
curl -X POST http://localhost:3001/mineBlock
``` 

### Send transaction
```
curl -H "Content-type: application/json" --data '{"address": receiver-address, "amount" : amount}' http://localhost:3001/sendTransaction
```

### Query transaction pool
```
curl http://localhost:3001/transactionPool
```

### Mine transaction
```
curl -H "Content-type: application/json" --data '{"address": receiver-address, "amount" : amount}' http://localhost:3001/chain/mineTransaction
```

### Get balance
```
curl http://localhost:3001/wallet/balance
```

### Query information about a specific address
```
curl http://localhost:3001/transaction/address/:address
```
### Query information about a specific block
```
curl http://localhost:3001/chain/hash/:hash
```

### Add peer
```
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6001"}' http://localhost:3001/peers/addPeer
```
### Query connected peers
```
curl http://localhost:3001/peers
```
