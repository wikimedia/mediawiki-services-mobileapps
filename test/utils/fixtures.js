const domino = require('domino');
const fs = require('fs');
const path = require('path');
const FIXTURES = 'test/fixtures/';
const yaml = require('js-yaml');
const PROCESSING = 'processing';
const P = require('bluebird');

/**
 * @param {!string} fileName name of the fixture file to load
 * @return {!string}
 */
const readFileSync = (fileName) => {
    return fs.readFileSync(path.resolve(FIXTURES, fileName), 'utf8');
};

/**
 * @param {!string} fileName name of the fixture file to load
 * @return {!Document}
 */
const readIntoDocument = (fileName) => {
    const html = readFileSync(fileName);
    return domino.createDocument(html);
};

/**
 * @param {!string} fileName name of the processing file to load
 * @return {!Document}
 */
const readProcessingScript = (fileName) => {
    const yamlFile = fs.readFileSync(path.resolve(PROCESSING, `${fileName}.yaml`));
    return yaml.safeLoad(yamlFile);
};

module.exports = {
  readFileSync,
  readIntoDocument,
  readProcessingScript
};
