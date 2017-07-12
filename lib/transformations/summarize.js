"use strict";

const domino = require('domino');
const flattenElements = require('./flattenElements');
const rmElementsWithSelector = require('./rmElementsWithSelector');

/**
 * Given a chunk of HTML, create a summary of the content
 * @param {string} html
 * @return {string} html summary
 */
module.exports = function(html) {
    const doc = domino.createDocument(html);
    flattenElements(doc, 'a');
    rmElementsWithSelector(doc, '.mw-ref');
    rmElementsWithSelector(doc, '.noexcerpts');
    rmElementsWithSelector(doc, 'math');
    return doc.body.innerHTML;
};
