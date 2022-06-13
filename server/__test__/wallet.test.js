const createServer = require('../src/utils/server.util');
const supertest = require('supertest');
const ecdsa = require('elliptic');
const p2p = require('../src/controller/p2p');
const { setUpSampleData, cleanUpSampleData, getDataKeys } = require('./test_data/sample/sample_data.util');

const ec = new ecdsa.ec('secp256k1');
const app = createServer();
const request = supertest(app);

const validAddressBody = (privateKey, body) => {
  const keys = Object.keys(body);
  const publicKey = ec.keyFromPrivate(privateKey, 'hex').getPublic().encode('hex');
  return keys.includes('address') && (body.address === publicKey);
};

const validWalletBody = (body) => {
  const keys = Object.keys(body);
  return keys.includes('balance') && (typeof body.balance === 'number');
};

describe('test wallet apis', () => {
  beforeAll(() => {
    p2p.initP2PServer(6002);
    setUpSampleData();
  });

  afterAll(() => {
    p2p.closeServer();
    cleanUpSampleData();
  });

  const keyData = getDataKeys();
  const loginKey = keyData.successKeys[0];

  it('should login successfully', async () => {
    await request.post('/auth/signin').send({ privateKey: loginKey }).expect(200);
  });

  describe('GET /wallet/address', () => {
    it('should return 200', async () => {
      await request.get('/wallet/address').expect(200);
    });

    it('should return valid body', async () => {
      const { body } = await request.get('/wallet/address');
      expect(validAddressBody(loginKey, body)).toBe(true);
    });
  });

  describe('GET /wallet/balance', () => {
    it('should return 200', async () => {
      await request.get('/wallet/balance').expect(200);
    });

    it('should return valid body', async () => {
      const { body } = await request.get('/wallet/balance');
      expect(validWalletBody(body)).toBe(true);
    });
  });
});