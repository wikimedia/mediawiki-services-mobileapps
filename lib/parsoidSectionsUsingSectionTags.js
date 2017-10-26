'use strict';

const parsoidDomUtils = require('parsoid-dom-utils');
const NodeType = require('./nodeType');

/**
 * @deprecated wait for Parsoid to implement this.
 * New sectioning code: wraps sections in <section> tags. Will likely
 * be replaced by code in Parsoid.
 * @param {!document} doc the parsed DOM Document of the Parsoid output
 */
function addSectionTags(doc) {
    // in case this is already handled by Parsoid don't try again
    if (!doc.querySelector('section')) {
        parsoidDomUtils.sections.wrap(doc);
    }
}

/**
 * Parse the next wiki section. A wiki section is contained inside a <section> tag.
 * If there is a nested sub section it ends right before that next sub section's
 * <section> tag starts.
 * @param {!Node} startingNode the DOM node to start parsing
 * @return {string} the HTML text of the next wiki section
 */
function parseNextSection(startingNode) {
    let sectionText = '';
    let node = startingNode;

    while (node) {
        if (node.tagName !== 'SECTION') {
            if (node.outerHTML) {
                sectionText += node.outerHTML;
            } else if (node.nodeType === NodeType.TEXT_NODE) {
                sectionText += node.textContent;
            }
            node = node.nextSibling;
        } else {
            return sectionText;
        }
    }
    return sectionText;
}

function getSectionNumber(sectionElement) {
    const sectionNumberString = sectionElement
        && sectionElement.getAttribute('data-section-number');
    return sectionNumberString ? parseInt(sectionNumberString, 10) : undefined;
}

/**
 * Gets the sections array, including HTML string and metadata for all sections
 * (id, anchor, line, toclevel).
 * @param {!document} doc the parsed DOM Document of the Parsoid output
 * @return {!sections[]} an array of section JSON elements
 */
function getSectionsText(doc) {
    const sections = [];
    const sectionElements = doc.querySelectorAll('section');

    const currentSectionElement = sectionElements[0];
    const currentSection = {};
    currentSection.id = 0;
    currentSection.text = currentSectionElement ? currentSectionElement.innerHTML : '';
    sections.push(currentSection);

    for (let i = 1; i < sectionElements.length; i++) {
        const currentSection = {};
        const currentSectionElement = sectionElements[i];
        currentSection.id = getSectionNumber(currentSectionElement);
        if (currentSection.id < 0) {
            continue;
        }

        const childEl = currentSectionElement.firstChild;

        if (childEl && /^H[1-6]$/.test(childEl.tagName)) {
            currentSection.text = parseNextSection(childEl.nextSibling); // text starts after H[1-6]
            currentSection.toclevel = parseInt(childEl.tagName.charAt(1), 10) - 1;
            currentSection.line = childEl.innerHTML.trim();
            currentSection.anchor = childEl.getAttribute('id');
        }

        sections.push(currentSection);
    }

    return sections;
}

module.exports = {
    addSectionTags,
    getSectionsText,
    testing: {
        parseNextSection
    }
};
