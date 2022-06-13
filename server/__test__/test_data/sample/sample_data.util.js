const fs = require('fs');
const test_paths = require('../const/test_path_constants');
const { KEYS_PATH, CHAIN_PATH } = require('../../../src/constants/paths.const');

const getDataKeys = () => {
  const data = fs.readFileSync(test_paths.test_keys);
  if (data.length !== 0) {
    return JSON.parse(data.toString());
  }
};

const getHashData = () => {
  const data = fs.readFileSync(test_paths.test_hash);
  if (data.length !== 0) {
    return JSON.parse(data.toString());
  }
};

const setUpSampleData = () => {
  const sampleChainData = fs.readFileSync(test_paths.sample_chain_data);
  const sampleKeyData = fs.readFileSync(test_paths.sample_keys_data);
  fs.writeFileSync(CHAIN_PATH, sampleChainData);
  fs.writeFileSync(KEYS_PATH, sampleKeyData);
};

const cleanUpSampleData = () => {
  fs.unlinkSync(CHAIN_PATH);
  fs.unlinkSync(KEYS_PATH);
};

module.exports = {
  getDataKeys,
  getHashData,
  setUpSampleData,
  cleanUpSampleData
};
