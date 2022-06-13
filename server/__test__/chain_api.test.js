const createServer = require('../src/utils/server.util');
const supertest = require('supertest');
const _ = require('lodash');
const { genesisBlock } = require('../src/constants/blockchain.const');
const { isValidChain } = require('../src/utils/chain.util');
const { setUpSampleData, cleanUpSampleData, getHashData } = require('./test_data/sample/sample_data.util');

const app = createServer();
const request = supertest(app);

describe('test chain apis', () => {
  describe('GET /chain', () => {
    it('should be 200', async () => {
      await request.get('/chain').expect(200);
    });

    it('should be an array body', async () => {
      const { body } = await request.get('/chain');
      expect(_.isArray(body)).toBe(true);
    });

    it('has valid genesis block', async () => {
      const { body } = await request.get('/chain');
      expect(body[0]).toEqual(genesisBlock);
    });

    it('should have valid chain', async () => {
      const { body } = await request.get('/chain');
      expect(isValidChain(body));
    });
  });

  describe('GET /chain/hash/:hash', () => {
    beforeAll(() => {
      setUpSampleData();
    });

    afterAll(() => {
      cleanUpSampleData();
    });

    const hashData = getHashData();

    it.each(hashData.validHashes)('should return 200', async (hash) => {
      await request.get(`/chain/hash/${hash}`).expect(200);
    });

    it.each(hashData.invalidHashes)('should return 404', async (hash) => {
      await request.get(`/chain/hash/${hash}`).expect(404);
    });
  });
});
