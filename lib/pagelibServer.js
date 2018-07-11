'use strict';

const BBPromise = require('bluebird');
const readFile = BBPromise.promisify(require('fs').readFile);

const jsFile = require.resolve('wikimedia-page-library');
// HACK: Get the corresponding .css file to the pagelib main .js file by swapping the file extension
const cssFile = jsFile.replace(/\.js$/, '.css');

function loadLocalFile(absPath) {
    return readFile(absPath, 'utf8');
}

function loadCss() {
    return loadLocalFile(cssFile);
}

module.exports = {
    loadCss
};
