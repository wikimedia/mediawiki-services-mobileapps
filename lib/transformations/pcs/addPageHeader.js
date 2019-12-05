'use strict';

const pagelib = require('../../../pagelib/build/wikimedia-page-library-transform.js');
const EditTransform = pagelib.EditTransform;
const addHrefToEditButton = require('./addHrefToEditButton');
const domUtil = require('../../domUtil');

/**
 * Adds a page header with title, lead section edit button, and optional description and
 * button for the title pronunciation.
 * @param {!Document} doc Parsoid DOM document
 * @param {!object} meta meta object with pronunciation and mw
 */
module.exports = (doc, meta) => {
    const body = doc.getElementById('pcs') || doc.body;
    const headerElement = doc.createElement('header');
    const firstSection = body && body.querySelector('section');
    if (firstSection) {
        body.insertBefore(headerElement, firstSection);
    } else {
        body.appendChild(headerElement);
    }

    const pronunciationUrl = meta.pronunciation && meta.pronunciation.url;

    const content = EditTransform.newEditLeadSectionHeader(doc, meta.mw.displaytitle,
        meta.mw.description, 'Add a description', meta.mw.description === undefined || meta.mw.description_source === 'central',
        true, pronunciationUrl);

    headerElement.appendChild(content);
    const title = domUtil.getParsoidLinkTitle(doc);
    if (!title) {
        return;
    }
    addHrefToEditButton(headerElement, 0, title);
};
