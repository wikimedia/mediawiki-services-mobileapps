'use strict';

const mUtil = require('../../mobile-util');

function _getIssueForMobileSections(el) {
    if (mUtil.getSectionIdForElement(el) === 0) {
        return { text: el.innerHTML };
    }
}

function _getIssueForMetadata(el) {
    return {
        section: mUtil.getSectionIdForElement(el),
        html: el.innerHTML
    };
}

function _removePageIssues(doc) {
    const els = doc.querySelectorAll('.ambox-multiple_issues,.ambox');
    Array.prototype.forEach.call(Array.prototype.reverse.call(els), (el) => {
        if (mUtil.getSectionIdForElement(el) === 0) {
            el.parentNode.removeChild(el);
        }
    });
}

/**
 * Internal function for extracting page issues from a document.
 * This method has side effects - removing page issues from the input.
 * @param {!Document} doc
 * @param {!Function} extract the extraction function used to produce a response item
 * @param {?Boolean} [remove] when true the hatnotes will be removed from the lead Document
 * @return {?Object[]} of issues or undefined if a page has no issues
 */
function _extractPageIssues(doc, extract, remove) {
    let issues;
    let els = doc.querySelectorAll('.ambox-multiple_issues table .mbox-text-span');
    // If no nodes found proceed to look for single page issues.
    els = els.length ? els : doc.querySelectorAll('.ambox .mbox-text-span');
    if (els.length) {
        issues = Array.prototype.map.call(els, el => extract(el)).filter(entry => !!entry);
        if (remove) {
            _removePageIssues(doc);
        }
    }
    if (issues && issues.length) {
        return issues;
    }
}

/**
 * Extracts page issues from document.
 * @param {!Document} doc
 * @return {?Object[]} of issues or undefined if a page has no issues
 */
function extractPageIssuesForMetadata(doc) {
    return _extractPageIssues(doc, _getIssueForMetadata);
}

/**
 * Extracts page issues from document.
 * This method has side effects - removing page issues from the input.
 * @param {!Document} doc
 * @param {?Boolean} [remove] when true the hatnotes will be removed from the lead Document
 * @return {?Object[]} of issues or undefined if a page has no issues
 */
function extractPageIssuesForMobileSections(doc, remove) {
    return _extractPageIssues(doc, _getIssueForMobileSections, remove);
}

module.exports = {
    extractPageIssuesForMetadata,
    extractPageIssuesForMobileSections
};
