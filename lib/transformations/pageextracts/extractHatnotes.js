'use strict';

const mUtil = require('../../mobile-util');

function _getHatnoteForMobileSections(el) {
    if (mUtil.getSectionIdForElement(el) === 0) {
        return el.innerHTML;
    }
}

function _getHatnoteForMetadata(el) {
    return {
        section: mUtil.getSectionIdForElement(el),
        html: el.innerHTML,
        text: el.textContent
    };
}

function _removeHatnotes(els) {
    Array.prototype.forEach.call(Array.prototype.reverse.call(els), (el) => {
        if (mUtil.getSectionIdForElement(el) === 0) {
            el.parentNode.removeChild(el);
        }
    });
}

/**
 * Internal function for extracting hatnotes from a document.
 * @param {!Document} doc
 * @param {!Function} extract the extraction function used to produce a response item
 * @param {?Boolean} [remove] when true the hatnotes will be removed from the lead Document
 * @return {?String[]} where each element is the inner html of a lead section hatnote
 */
function _extractHatnotes(doc, extract, remove) {
    let hatnotes;
    const els = doc.querySelectorAll('.hatnote,.dablink');
    if (els.length) {
        hatnotes = Array.prototype.map.call(els, el => extract(el)).filter(entry => !!entry);
        if (remove) {
            _removeHatnotes(els);
        }
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
 * @param {?Boolean} [remove] when true the hatnotes will be removed from the lead Document
 * @return {?String[]} where each element is the inner html of a lead section hatnote
 */
function extractHatnotesForMobileSections(doc, remove) {
    return _extractHatnotes(doc, _getHatnoteForMobileSections, remove);
}

module.exports = {
    extractHatnotesForMetadata,
    extractHatnotesForMobileSections
};
