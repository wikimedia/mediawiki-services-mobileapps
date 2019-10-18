const domino = require('domino');
const fs = require('fs');
const path = require('path');
const FIXTURES = 'test/fixtures/';

/**
 * @param {!string} fileName name of the fixture file to load
 * @return {!Document}
 */
const readIntoDocument = (fileName) => {
    const html = fs.readFileSync(path.resolve(FIXTURES, fileName));
    return domino.createDocument(html);
};

module.exports = {
  readIntoDocument
};
