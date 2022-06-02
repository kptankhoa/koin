# MyCoin
MyCoin: Personal Blockchain Cryptocurrency Project\
HCMC University of Science\
Subject: New Technologies in Software Development\
Author: Khoa Phan - Student ID: 1712537\
Based on: NaiveCoin - https://github.com/lhartikk/naivecoin

## Installation
```
npm install
npm start
open '/mycoin-ui/index.html'
```

## API Usage:
### Get blockchain
```
curl http://localhost:3001/blocks
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
curl -H "Content-type: application/json" --data '{"address": receiver-address, "amount" : amount}' http://localhost:3001/mineTransaction
```

### Get balance
```
curl http://localhost:3001/balance
```

### Query information about a specific address
```
curl http://localhost:3001/address/:address
```
### Query information about a specific block
```
curl http://localhost:3001/block/:hash
```

### Add peer
```
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6001"}' http://localhost:3001/addPeer
```
### Query connected peers
```
curl http://localhost:3001/peers
```
