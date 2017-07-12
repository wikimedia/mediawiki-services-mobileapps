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
    rmElementsWithSelector(doc, 'span:empty,b:empty,i:empty,p:empty');

    html = doc.body.innerHTML;
    // 1. Replace any parentheticals which have at least one space inside
    html = html.replace(/\(.+ .+\)/g, ' ');
    // 2. Remove any empty parentheticals due to transformations
    html = html.replace(/\(\)/g, ' ');

    // 3. Remove content inside any other non-latin parentheticals. The behaviour is
    // the same as 1 but for languages that are not latin based
    html = html.replace(/[（（（].+ .+[）））]/g, ' ');

    // 4. remove all double spaces created by the above
    html = html.replace(/ +/g, ' ');
    return html;
};
