'use strict';

const pagelib = require('../../../pagelib/build/wikimedia-page-library-transform.js');
const EditTransform = pagelib.EditTransform;
const domUtil = require('../../domUtil');

/**
 * Adds a page header with title, and optional description and button for the title pronunciation.
 * @param {!Document} doc Parsoid DOM document
 * @param {!object} meta meta object with pronunciation and mw
 * @param {!string} addADescriptionLabel localized string for adding a description
 */
module.exports = (doc, meta, addADescriptionLabel) => {
    const body = doc.getElementById('pcs') || doc.body;
    const headerElement = doc.createElement('header');
    const firstSection = body && body.querySelector('section');
    if (firstSection) {
        body.insertBefore(headerElement, firstSection);
    } else {
        body.appendChild(headerElement);
    }

    const pronunciationUrl = meta.pronunciation && meta.pronunciation.url;
    const wikibaseItem = meta.mw && meta.mw.pageprops && meta.mw.pageprops.wikibase_item;
    const content = EditTransform.newPageHeader(doc, meta.mw.displaytitle,
        meta.mw.description, meta.mw.description_source, wikibaseItem, addADescriptionLabel, wikibaseItem && (meta.mw.description === undefined || meta.mw.description_source === 'central'),
        pronunciationUrl);

    /* DOM sink status: safe - content is created from mwapi call fetching metadata */
    headerElement.appendChild(content);
};
