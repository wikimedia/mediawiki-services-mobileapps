'use strict';

const parsoidSectionsUsingDivs = require('./parsoidSectionsUsingDivs');
const parsoidSectionsUsingSectionTags = require('./parsoidSectionsUsingSectionTags');

/**
 * New sectioning code: wraps sections in <section> tags. Will likely
 * be replaced by code in Parsoid.
 * @param {!document} doc the parsed DOM Document of the Parsoid output
 */
function addSectionDivs(doc) {
    // in case this is already handled by Parsoid (T114072) don't try again
    if (!doc.querySelector('section')) {
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
    if (!doc.querySelector('section')) {
        return parsoidSectionsUsingDivs.getSectionsText(doc);
    } else {
        return parsoidSectionsUsingSectionTags.getSectionsText(doc);
    }
}

module.exports = {
    addSectionDivs,
    getSectionsText
};
