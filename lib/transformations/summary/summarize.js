'use strict';

const mUtil = require('../../mobile-util');
const flattenElements = require('../flattenElements');
const escapeParens = require('../escapeParens');
const removeAttributes = require('../rmAttributes');
const rmElements = require('../rmElements');
const sanitizeSummary = require('./sanitizeSummary');

const reProbableFormulaPresent = /(\d|[A-Z][a-z]?|\))<su[bp]>[0-9+-]{1,3}<\/su[bp]>/;

/**
 * Recursively discard any parentheticals that themselves are inside parentheticals
 *
 * @param {string} html
 * @return {string} html summary with nested parentheticals removed.
 */
function removeNestedParentheticals(html) {
    // Remove any nested parentheticals
    const regex = /([(（][^()（）]*)([(（][^()（）]+[)）])/g;
    const newHtml = html.replace(regex, '$1 ');

    if (newHtml.match(regex)) {
        return removeNestedParentheticals(newHtml);
    } else {
        return newHtml;
    }
}

/**
 * Given a chunk of HTML, create a summary of the content
 *
 * @param {string} html
 * @return {!Object} html summary
 */
function summarize(html) {
    return mUtil.createDocument(html)
    .then((doc) => {
        flattenElements(doc, 'a', [ 'class', 'style' ], [ 'mw-redirect', 'new' ]);
        flattenElements(doc, 'span', [ 'class', 'style' ]);
        rmElements(doc.body, 'math,table,div,input,script,style,ul.gallery');
        rmElements(doc.body, '.mw-ref,.reference,.noexcerpt,.nomobile,.noprint,.sortkey');
        for (let i = 8, runAgain = true; i > 0 && runAgain; i--) {
            runAgain = rmElements(doc.body, 'span:empty,b:empty,i:empty,p:empty');
        }
        removeAttributes(doc.body, '*', [ 'about', 'data-mw', 'id', 'typeof' ]);
        escapeParens.escapeAllAttributes(doc.body);

        html = doc.body.innerHTML;

        if (!reProbableFormulaPresent.test(html)) {
            html = removeNestedParentheticals(html);
            // (1) Replace any parentheticals which have at least one space inside
            // and at least one space or No-Break Space before.
            html = html.replace(/( |&nbsp;)\([^)]+ [^)]*\)/g, ' ');

            // Remove content inside any other non-Latin parentheticals. The behaviour is the same
            // as 1 but for languages that are not Latin based.
            // One difference to #1 is that in addition to a space the non-Latin colon or comma
            // could also trigger the removal of parentheticals.
            // Another difference is that a leading space is not required since in non-Latin
            // languages that rarely happens.
            html = html.replace(/（[^）]+[ ：，][^）]+）/g, ' ');
        }

        // Remove any empty parentheticals due to earlier transformations
        // (could have happened even before summarize is called)
        html = html.replace(/\(\)/g, ' ');

        // Remove spaces around No-Break Space
        html = html.replace(/ *(&nbsp;)+ */g, '$1');

        // Remove any trailing spaces before closing p tag
        html = html.replace(/ +(<\/p>)/g, '$1');

        html = escapeParens.unescape(html);
        html = sanitizeSummary.sanitize(html);

        // Remove all double spaces
        html = html.replace(/ +/g, ' ');

        // Replace any leading spaces or &nbsp; before punctuation for non-Latin
        // (which could be the result of earlier transformations)
        html = html.replace(/( |&nbsp;)([，。])/g, '$2');

        // Replace any leading spaces or &nbsp; before punctuation for Latin
        // (which could be the result of earlier transformations), but only if whitespace
        // or a closing tag come afterwards.
        html = html.replace(/( |&nbsp;)([,.!?])( |&nbsp;|<\/)/g, '$2$3');

        doc.body.innerHTML = html;

        return {
            extract: doc.body.textContent,
            extract_html: html
        };
    });
}

module.exports = {
    summarize,
    testing: {
        reProbableFormulaPresent
    }
};
