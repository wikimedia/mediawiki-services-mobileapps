'use strict';

const mUtil = require('../../mobile-util');

function _getIssueForMobileSections(el) {
    if (mUtil.getSectionIdForElement(el) === 0) {
        return {
            html: el.innerHTML,
            text: el.textContent
        };
    }
}

function _getIssueForMetadata(el) {
    return {
        section: mUtil.getSectionIdForElement(el),
        html: el.innerHTML
    };
}

/**
 * Internal function for extracting page issues from a document.
 * This method has side effects - removing page issues from the input.
 *
 * @param {!Document} doc
 * @param {!Function} extract the extraction function used to produce a response item
 * @return {?Object[]} of issues or undefined if a page has no issues
 */
function _extractPageIssues(doc, extract) {
    let issues;
    let els = doc.querySelectorAll('.ambox-multiple_issues table .mbox-text-span');
    // If no nodes found proceed to look for single page issues.
    els = els.length ? els : doc.querySelectorAll('.ambox .mbox-text-span');
    if (els.length) {
        issues = Array.prototype.map.call(els, el => extract(el)).filter(entry => !!entry);
    }
    if (issues && issues.length) {
        return issues;
    }
}

/**
 * Extracts page issues from document.
 *
 * @param {!Document} doc
 * @return {?Object[]} of issues or undefined if a page has no issues
 */
function extractPageIssuesForMetadata(doc) {
    return _extractPageIssues(doc, _getIssueForMetadata);
}

/**
 * Extracts page issues from document.
 * This method has side effects - removing page issues from the input.
 *
 * @param {!Document} doc
 * @param {?boolean} [remove] when true the hatnotes will be removed from the lead Document
 * @return {?Object[]} of issues or undefined if a page has no issues
 */
function extractPageIssuesForMobileSections(doc, remove) {
    return _extractPageIssues(doc, _getIssueForMobileSections, remove);
}

module.exports = {
    extractPageIssuesForMetadata,
    extractPageIssuesForMobileSections
};
