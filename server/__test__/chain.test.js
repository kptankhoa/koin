const dataUtil = require('../src/utils/data.util');
const _ = require('lodash');
const { genesisBlock } = require('../src/constants/blockchain.const');

describe('test chain file', () => {
  describe('get chain from file', () => {
    const chain = dataUtil.getChain();
    it('should be array', () => {
      expect(_.isArray(chain)).toBe(true);
    });

    it('has valid genesis block', () => {
      expect(JSON.stringify(chain[0]) === JSON.stringify(genesisBlock)).toBe(true);
    });
  });
});
