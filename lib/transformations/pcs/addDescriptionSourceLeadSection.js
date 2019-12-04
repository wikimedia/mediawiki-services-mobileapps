'use strict';

/**
 * Adds data-description-source attribute to the first section edit
 * @param {!Document} doc Parsoid DOM document
 * @param {!object} meta meta object with the following properties:
 *   {?string} descriptionsource
 */
module.exports = (doc, meta) => {
    const firstSectionEditButton = doc.querySelector('a.pcs-edit-section-link[data-id="0"]');
    const descriptionSource = meta.mw.description_source;
    if (firstSectionEditButton && descriptionSource) {
        firstSectionEditButton.setAttribute('data-description-source', descriptionSource);
    }
};
