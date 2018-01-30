'use strict';

const domino = require('domino');
const flattenElements = require('./flattenElements');
const rmElementsWithSelector = require('./rmElementsWithSelector');
const sanitizeSummary = require('./sanitizeSummary');

/**
 * Recursively discard any parentheticals that themselves are inside parentheticals
 * @param {string} html
 * @return {string} html summary with nested parentheticals removed.
 */
function removeNestedParentheticals(html) {
    // Remove any nested parentheticals
    const regex = /(\([^()]*)(\([^()]+\))/g;
    const newHtml = html.replace(regex, '$1 ');

    if (newHtml.match(regex)) {
        return removeNestedParentheticals(newHtml);
    } else {
        return newHtml;
    }
}

/**
 * Given a chunk of HTML, create a summary of the content
 * @param {string} html
 * @return {!object} html summary
 */
module.exports = function(html) {
    const doc = domino.createDocument(html);
    flattenElements(doc, 'a');
    rmElementsWithSelector(doc, '.mw-ref, .reference');
    rmElementsWithSelector(doc, '.noexcerpt');
    rmElementsWithSelector(doc, '.noprint');
    rmElementsWithSelector(doc, 'math');
    rmElementsWithSelector(doc, 'span:empty,b:empty,i:empty,p:empty');

    html = doc.body.innerHTML;
    html = removeNestedParentheticals(html);
    // 1. Replace any parentheticals which have at least one space inside
    html = html.replace(/\([^)]+ [^)]+\)/g, ' ');
    // 2. Remove any empty parentheticals due to transformations
    html = html.replace(/\(\)/g, ' ');

    // 3. Remove content inside any other non-latin parentheticals. The behaviour is
    // the same as 1 but for languages that are not latin based. The other difference
    // to #1 is that in addition to a space the non-latin colon or comma could also
    // trigger the removal of parentheticals.
    html = html.replace(/（[^）]+[ ：，][^）]+）/g, ' ');

    // 4. Remove all double spaces created by the above
    html = html.replace(/ +/g, ' ');

    // 5. Replace any leading spaces before punctuation for latin and non-latin
    // (which could be the result of earlier transformations)
    html = html.replace(/ ([,.!?，。])/g, '$1');

    // Remove any trailing spaces before closing tag
    html = html.replace(/ +(<\/\w+>)/g, '$1');

    html = sanitizeSummary.sanitize(html);
    doc.body.innerHTML = html;

    return {
        extract: doc.body.textContent,
        extract_html: html
    };
};
