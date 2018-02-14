'use strict';

const domino = require('domino');
const parsoid = require('./parsoid-access');
const transforms = require('./transforms');
const parseSpoken = require('./parseProperty').parseSpokenWikipedia;

/**
 * Builds the metadata endpoint response.
 * @param {!Object} htmlResponse raw Parsoid page HTML response
 * @param {!Object} meta page metadata from the MW API
 * @return {!Object} the metadata response object
 */
function buildMetadata(htmlResponse, meta) {
    const doc = domino.createDocument(htmlResponse.body);
    const revTid = parsoid.getRevAndTidFromEtag(htmlResponse.headers);
    return {
        revision: revTid.revision,
        tid: revTid.tid,
        hatnotes: transforms.extractHatnotesForMetadata(doc),
        issues: transforms.extractPageIssuesForMetadata(doc),
        spoken: parseSpoken(doc),
        categories: meta.categories,
        coordinates: meta.coordinates
    };
}

module.exports = {
    buildMetadata
};
