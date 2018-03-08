"use strict";

const structureReferenceSections = require('./structureReferenceListContent');

/**
 * Scan the DOM document for reference lists
 * @param {!Document} document DOM document
 * @param {!Logger} logger a logger instance associated with the request
 * @return { reference_lists, references_by_id }
 */
function extractReferenceLists(document, logger) {
    const referenceLists = [];
    let referencesById = {};
    const refListElements = document.querySelectorAll('ol.mw-references');
    refListElements.forEach((refListElement) => {
        const result = structureReferenceSections.buildReferenceList(refListElement, logger);
        referenceLists.push({
            type: 'reference_list',
            id: refListElement.getAttribute('about'),
            order: result.order
        });
        referencesById = Object.assign(referencesById, result.references_by_id);
    });
    return { reference_lists: referenceLists, references_by_id: referencesById };
}

module.exports = extractReferenceLists;
