'use strict';

const EditTransform = require('wikimedia-page-library').EditTransform;

/**
 * Enables edit buttons to be shown (and which ones).
 * @param {!Document} document Parsoid document
 */
module.exports = (document) => {
    EditTransform.setEditButtons(document, false, false);
};
