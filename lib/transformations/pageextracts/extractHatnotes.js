'use strict';

const mUtil = require('../../mobile-util');

const DEWIKI_HATNOTE_SELECTORS = [
    'table#Vorlage_Begriffsklärungshinweis tbody > tr > td',
    'table#Vorlage_Dieser_Artikel tbody > tr > td'
];

function _getHatnoteForMobileSections(el) {
    if (mUtil.getSectionIdForElement(el) === 0 && el.textContent.trim().length) {
        return el.innerHTML.trim();
    }
}

function _getHatnoteForMetadata(el) {
    if (el.textContent.trim().length) {
        return {
            section: mUtil.getSectionIdForElement(el),
            html: el.innerHTML.trim()
        };
    }
}

/**
 * Internal function for extracting hatnotes from a document.
 * @param {!Document} doc
 * @param {!Function} extract the extraction function used to produce a response item
 * @return {?String[]} where each element is the inner html of a lead section hatnote
 */
function _extractHatnotes(doc, extract) {
    let hatnotes;
    const els = doc.querySelectorAll(`.hatnote,.dablink,${DEWIKI_HATNOTE_SELECTORS.join()}`);
    if (els.length) {
        hatnotes = Array.prototype.map.call(els, el => extract(el)).filter(entry => !!entry);
    }
    if (hatnotes && hatnotes.length) {
        return hatnotes;
    }
}

/**
 * @param {!Document} doc
 * @return {?Object[]} where each element contains the hatnote's text, inner html, and section
 */
function extractHatnotesForMetadata(doc) {
    return _extractHatnotes(doc, _getHatnoteForMetadata);
}

/**
 * @param {!Document} doc
 * @return {?String[]} where each element is the inner html of a lead section hatnote
 */
function extractHatnotesForMobileSections(doc) {
    return _extractHatnotes(doc, _getHatnoteForMobileSections);
}

module.exports = {
    extractHatnotesForMetadata,
    extractHatnotesForMobileSections
};
