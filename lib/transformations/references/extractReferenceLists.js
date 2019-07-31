'use strict';

const structureReferenceSections = require('./structureReferenceListContent');

/**
 * Extracts heading information. Removes the section heading element.
 * @param {!Element} sectionElement an ancestor element of the reference list
 */
const extractHeading = (sectionElement) => {
    const headingElement
        = sectionElement && sectionElement.querySelector('h1,h2,h3,h4,h5,h5,h6');
    if (headingElement) {
        const result = {
            id: headingElement.getAttribute('id'),
            html: headingElement.innerHTML.trim()
        };
        headingElement.parentNode.removeChild(headingElement);
        return result;
    } else {
        return undefined;
    }
};

/**
 * Gets the about attribute value of the refListElement or an ancestor element.
 * @param {!Element} refListElement DOM element of the reference list
 */
const getAbout = (refListElement) => {
    let about = refListElement.getAttribute('about');
    if (!about) {
        const wrapper = refListElement.closest('.mw-references-wrap');
        if (wrapper) {
            about = wrapper.getAttribute('about');
        }
    }
    return about;
};

/**
 * Scan the DOM document for reference lists
 * @param {!Document} document DOM document
 * @param {!Logger} logger a logger instance associated with the request
 * @return { reference_lists, references_by_id }
 */
module.exports = (document, logger) => {
    const referenceLists = [];
    let referencesById = {};
    const refListElements = document.querySelectorAll('ol.mw-references');
    refListElements.forEach((refListElement) => {
        const result = structureReferenceSections.buildReferenceList(refListElement, logger);
        try {
            const sectionElement = refListElement.closest('section[data-mw-section-id]') || undefined;
            const about = getAbout(refListElement);
            const sectionHeading = extractHeading(sectionElement);
            refListElement.parentNode.removeChild(refListElement);
            referenceLists.push({
                id: about,
                section_heading: sectionHeading,
                order: result.order
            });
            referencesById = Object.assign(referencesById, result.references_by_id);
        } catch (e) {
            logger.log('error/transformations', `Error extracting reference lists: ${e}`);
        }
    });
    return { reference_lists: referenceLists, references_by_id: referencesById };
};
