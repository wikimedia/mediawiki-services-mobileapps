'use strict';

const EditTransform = require('wikimedia-page-library').EditTransform;
const addHrefToEditButton = require('./addHrefToEditButton');
const domUtil = require('../../domUtil');

/**
 * Adds a page header with title, lead section edit button, and optional description and
 * button for the title pronunciation.
 * @param {!Document} doc Parsoid DOM document
 * @param {!object} meta meta object with the following properties:
 *   {!string} displayTitle the title of the page as displayed
 *   {!string} linkTitle the title of the page that can be used to link to it
 *   {boolean} descriptionEditable
 *   {?string} description
 *   {?boolean} hasPronunciation
 */
module.exports = (doc, meta) => {
    const body = doc.body;
    const headerElement = doc.createElement('header');
    body.insertBefore(headerElement, body.firstChild);
    const pronunciationUrl = meta.parsoid.meta.pronunciation && meta.parsoid.meta.pronunciation.url;

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
