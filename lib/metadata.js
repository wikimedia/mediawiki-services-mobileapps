'use strict';

const domino = require('domino');
const transforms = require('./transforms');
const parseSpoken = require('./parseProperty').parseSpokenWikipedia;

/**
 * Builds the metadata endpoint response.
 * @param {!Object} html raw Parsoid page HTML
 * @param {!Object} lead cached page lead object from mobile-sections-lead
 * @return {!Object} the metadata response object
 */
function buildMetadata(html, lead) {
    const doc = domino.createDocument(html.body);
    const leadDoc = domino.createDocument(lead.body.sections[0].text);
    return {
        hatnotes: transforms.extractHatnotes(leadDoc),
        spoken: parseSpoken(doc)
    };
}

module.exports = {
    buildMetadata
};
