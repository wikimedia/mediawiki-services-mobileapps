'use strict';

const parsoidSectionsUsingDivs = require('./parsoidSectionsUsingDivs');
const parsoidSectionsUsingSectionTags = require('./parsoidSectionsUsingSectionTags');

/**
 * Determines if Parsoid added section tags. See T114072.
 * @param {!document} doc the parsed DOM Document of the Parsoid output
 * @return {boolean} true if Parsoid added section tags
 */
function hasParsoidSections(doc) {
    return Boolean(doc.querySelector('section[data-mw-section-id]'));
}

/**
 * New sectioning code: wraps sections in <section> tags. Will likely
 * be replaced by code in Parsoid.
 * @param {!document} doc the parsed DOM Document of the Parsoid output
 */
function addSectionDivs(doc) {
    if (!hasParsoidSections(doc)) {
        parsoidSectionsUsingDivs.addSectionDivs(doc);
    }
}

/**
 * Gets the sections array, including HTML string and metadata for all sections
 * (id, anchor, line, toclevel).
 * @param {!document} doc the parsed DOM Document of the Parsoid output
 * @return {!sections[]} an array of section JSON elements
 */
function getSectionsText(doc) {
    if (!hasParsoidSections(doc)) {
        return parsoidSectionsUsingDivs.getSectionsText(doc);
    } else {
        return parsoidSectionsUsingSectionTags.getSectionsText(doc);
    }
}

module.exports = {
    hasParsoidSections,
    addSectionDivs,
    getSectionsText
};
