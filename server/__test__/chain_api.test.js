const createServer = require('../src/utils/server.util');
const request = require('supertest');
const _ = require('lodash');
const { genesisBlock } = require('../src/constants/blockchain.const');
const { isValidChain } = require('../src/utils/chain.util');

const app = createServer();

describe('test chain apis', () => {
  describe('get chain api', () => {

    it('should be 200', async () => {
      await request(app).get('/chain').expect(200);
    });

    it('should be an array body', async () => {
      const { body } = await request(app).get('/chain');
      expect(_.isArray(body)).toBe(true);
    });

    it('has valid genesis block', async () => {
      const { body } = await request(app).get('/chain');
      expect(body[0]).toEqual(genesisBlock);
    });

    it('should have valid chain', async () => {
      const { body } = await request(app).get('/chain');
      expect(isValidChain(body));
    });

  });
});
