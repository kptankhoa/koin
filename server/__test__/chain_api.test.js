const createServer = require('../src/utils/server.util');
const request = require('supertest');
const _ = require('lodash');

const app = createServer();

describe('test chain apis', () => {
  describe('get chain api', () => {

    it('should be 200', async () => {
      await request(app).get('/chain').expect(200);
    });

    it('should be an array body', async () => {
      const { body } = await request(app).get('/chain');
      expect(_.isArray(body));
    });

  });
});
