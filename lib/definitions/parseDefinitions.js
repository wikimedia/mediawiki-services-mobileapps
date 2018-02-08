'use strict';

const parseDefinitionsUsingDivs = require('./parseDefinitionsUsingDivs');
const parseDefinitionsUsingSectionTags = require('./parseDefinitionsUsingSectionTags');
const parsoidSectionsUsingDivs = require('../sections/parsoidSectionsUsingDivs');
const parsoidSections = require('../sections/parsoidSections');

/**
 * Parses Wiktionary definitions. Delegates to the correct implementation.
 * @param {!document} doc the parsed DOM Document of the Parsoid output
 * @param {!string} domain the domain the request was directed to
 * @param {!string} title the title of the page requested
 * @return {Object} an object structure with definitions (with examples, where available)
 * for supported partOfSpeeches (Noun, Verb, ...) of all language headings found on the given
 * Wiktionary page
 */
function parseDefinitions(doc, domain, title) {
    if (parsoidSections.hasParsoidSections(doc)) {
        return parseDefinitionsUsingSectionTags(doc, domain, title);
    } else {
        parsoidSectionsUsingDivs.addSectionDivs(doc);
        return parseDefinitionsUsingDivs(doc, domain, title);
    }
}

module.exports = parseDefinitions;
