'use strict';

const CollapseTableTransform = require('wikimedia-page-library').CollapseTable;
const domUtil = require('../../domUtil');

/**
 * Runs the CollapseTableTransform.prepareTables() from the page library.
 * @param {!Document} document Parsoid Document
 */
module.exports = (document) => {
    // HACK: The pagelib CSS for themes depends on a content class. Adding this to the body
    // for now. Should we add a <div class="content"> around the section tags or add that class
    // to all section elements?
    document.body.classList.add('content');

    CollapseTableTransform.prepareTables(document, domUtil.getParsoidPlainTitle(document),
        'Quick facts', 'More information', 'Close' /* TODO: I18N these strings */);
};
