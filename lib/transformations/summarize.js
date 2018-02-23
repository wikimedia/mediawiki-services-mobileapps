'use strict';

const domino = require('domino');
const flattenElements = require('./flattenElements');
const escapeParens = require('./escapeParens');
const removeAttributes = require('./removeAttributes');
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
    rmElementsWithSelector(doc, 'math,table,div,input,script,style,ul.gallery');
    rmElementsWithSelector(doc, '.mw-ref,.reference,.noexcerpt,.nomobile,.noprint,.sortkey');
    for (let i = 8, runAgain = true; i > 0 && runAgain; i--) {
        runAgain = rmElementsWithSelector(doc, 'span:empty,b:empty,i:empty,p:empty');
    }
    removeAttributes(doc, '*', ['about', 'data-mw', 'id', 'typeof']);
    escapeParens.escapeAllAttributes(doc.body);

    html = doc.body.innerHTML;
    html = removeNestedParentheticals(html);
    // (1) Replace any parentheticals which have at least one space inside
    // and at least one space before.
    html = html.replace(/ \([^)]+ [^)]+\)/g, ' ');
    // Remove any empty parentheticals due to transformations
    html = html.replace(/\(\)/g, ' ');

    // Remove content inside any other non-latin parentheticals. The behaviour is the same as 1
    // but for languages that are not latin based.
    // One difference to #1 is that in addition to a space the non-latin colon or comma could also
    // trigger the removal of parentheticals.
    // Another difference is that a leading space is not required since in non-latin languages
    // that rarely happens.
    html = html.replace(/（[^）]+[ ：，][^）]+）/g, ' ');

    // Flatten spans with space or No-Break Space, remove outer spaces
    html = html.replace(/ *<span>(&nbsp;| *)<\/span> */g, '$1');

    // Remove all double spaces
    html = html.replace(/ +/g, ' ');

    // Replace any leading spaces before punctuation for latin and non-latin
    // (which could be the result of earlier transformations)
    html = html.replace(/ ([,.!?，。])/g, '$1');

    // Remove any trailing spaces before closing p tag
    html = html.replace(/ +(<\/p>)/g, '$1');

    html = escapeParens.unescape(html);
    html = sanitizeSummary.sanitize(html);
    doc.body.innerHTML = html;

    return {
        extract: doc.body.textContent,
        extract_html: html
    };
};
