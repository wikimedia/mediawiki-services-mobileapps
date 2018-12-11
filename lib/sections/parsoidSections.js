'use strict';

const mUtil = require('../mobile-util');
const NodeType = require('../nodeType');

/**
 * Gets the section number from Parsoid.
 * @param {!Element} sectionElement a <section> DOM element
 * @return {int} the section number as reported by Parsoid
 */
function getSectionNumber(sectionElement) {
    const sectionNumberString = sectionElement
        && sectionElement.getAttribute('data-mw-section-id');
    return sectionNumberString ? parseInt(sectionNumberString, 10) : undefined;
}

function appendSectionText(node, currentSection, state) {
    // Deal with text nodes
    if (node.nodeType === NodeType.TEXT_NODE) {
        currentSection.text += node.textContent;
    } else {
        currentSection.text += node.outerHTML;
        state.pauseDescent = true;
    }
}

// skip lead sections since they don't have headings;
// no line and no anchor means incomplete section
function shouldLogInvalidSectionWarning(sectionObj) {
    return sectionObj.id >= 1 && !sectionObj.line && !sectionObj.anchor;
}

function validatePreviousSection(logger, allSections, sectionObj) {
    if (allSections.length === 0) {
        return;
    }

    if (!sectionObj) {
        sectionObj = allSections[allSections.length - 1];
    }

    if (shouldLogInvalidSectionWarning(sectionObj)) {
        logger.log('warn/sectioning', {
            msg: 'Cannot find heading for section',
            section_number: sectionObj.id
        });
    }
}

/**
 * Visits one DOM node. Do the stuff that needs to be done when a single DOM node is handled.
 * In this case, starts a new section object when a <section> tag is encountered that is a
 * direct descendant
 * @param {!Logger} logger the app's bunyan logger
 * @param {!Node} node the node to visit
 * @param {!Object[]} allSections the array containing the results
 * @param {!Object} state some state to pass around
 */
function visit(logger, node, allSections, state) {
    let sectionObj = allSections.length > 0 ? allSections[allSections.length - 1] : undefined;
    if (node.tagName === 'SECTION') {
        validatePreviousSection(logger, allSections, sectionObj);

        sectionObj = { id: getSectionNumber(node), text: '' };
        if (sectionObj.id < 0) {
            sectionObj.noedit = true;
        }
        allSections.push(sectionObj);
        state.pauseDescent = false;
    } else if (sectionObj && !sectionObj.anchor // heading info not yet filled out
            && /^H[1-6]$/.test(node.tagName) // we're at a heading tag
            && node.parentNode.tagName === 'SECTION' // direct descendant of a section
            && !node.previousSibling) { // nothing before it on the same level
        sectionObj.toclevel = parseInt(node.tagName.charAt(1), 10) - 1;
        sectionObj.line = node.innerHTML.trim();
        sectionObj.anchor = node.getAttribute('id');
        state.pauseDescent = true;
    } else if (sectionObj) {
        appendSectionText(node, sectionObj, state);
    }
}

function ensureLeadSection(allSections) {
    if (allSections.length === 0) {
        allSections.push({ id: 0, text: '' });
    }
}

/**
 * Traversed DOM tree iteratively (depth first).
 * This started out with a traditional iterative DFS algorithm but added a boolean to stop
 * descending so we don't duplicate content since elsewhere outerHTML is used (which contains
 * content of sub-nodes).
 * @param {!Logger} logger the app's bunyan logger
 * @param {!Element} rootElement the root of the DOM tree which needs to be traversed
 * @param {!Object[]} allSections holds the results
 */
function traverseDF(logger, rootElement, allSections) {
    const state = {};
    let nodesToVisit = [ rootElement ];

    while (nodesToVisit.length > 0) {
        const currentNode = nodesToVisit.shift();
        visit(logger, currentNode, allSections, state);
        if (!state.pauseDescent) {
            nodesToVisit = [
                ...(currentNode.childNodes || []), // depth first
                ...nodesToVisit,
            ];
        }
    }
    ensureLeadSection(allSections);
    validatePreviousSection(logger, allSections);
}

function getSectionsText(doc, logger) {
    const allSections = [];
    traverseDF(logger, doc.body, allSections);
    return allSections;
}

/**
 * @param {!string} html Parsoid HTML for the page
 * @return {!Document} a new DOM Document containing only the lead section
 */
function createDocumentFromLeadSection(html) {
    const sections = html.split(/<section/i).filter(s => /^\s+data-mw-section-id=[^>\s\d]*?0[^>]*?>/i.test(s));
    return mUtil.createDocument(sections[0] ? sections[0].replace(/[^>]*?>/, '').replace(/<\/section>/i, '') : '');
}

module.exports = {
    getSectionsText,
    createDocumentFromLeadSection,
    testing: {
        parseSections: traverseDF,
        shouldLogInvalidSectionWarning,
        validatePreviousSection
    }
};
