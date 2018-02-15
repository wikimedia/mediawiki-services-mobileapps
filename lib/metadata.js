'use strict';

const domino = require('domino');
const transforms = require('./transforms');
const parseSpoken = require('./parseProperty').parseSpokenWikipedia;

/**
 * Builds the metadata endpoint response.
 * @param {!Object} htmlResponse raw Parsoid page HTML response
 * @return {!Object} the metadata response object
 */
function buildMetadata(htmlResponse) {
    const doc = domino.createDocument(htmlResponse.body);
    return {
        hatnotes: transforms.extractHatnotesForMetadata(doc),
        spoken: parseSpoken(doc)
    };
}

module.exports = {
    buildMetadata
};
