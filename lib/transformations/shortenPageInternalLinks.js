'use strict';

const domUtil = require('../domUtil');

/**
 * Shortens the href value of links to any anchor on the same page. This is for both links to
 * references and other links to anchors on the same page.
 * The Android app detects these if the href starts with a '#' character. A recent Parsoid change
 * added './' and the title before the '#'.
 * @param {!Document} doc DOM Document representation of the current page content
 * as provided by mwapi.getDbTitle()
 */
module.exports = (doc) => {

    /**
     * Build a CSS selector that works around the Domino issue of potentially having single-quotes
     * in the selector. See https://github.com/fgnass/domino/issues/95
     * @param {!string} dbTitle the title of the current page
     * @return {!string} selector which can be used to find HTML nodes containing reference links
     */
    const buildSelector = (dbTitle) => {
        const start = 'a[href^=';
        const end = ']';
        const quoteIndex = dbTitle.search(/['"]/);
        const prefix = './';
        let selectorTitle;
        if (quoteIndex === -1) {
            // no quote found. Can use the full title.
            selectorTitle = `${dbTitle}#`;
        } else {
            // cannot use the full title :(
            selectorTitle = dbTitle.substr(0, quoteIndex);
        }
        return `${start}${prefix}${selectorTitle}${end}, ${start}${selectorTitle}${end}`;
    };

    const dbTitle = domUtil.getParsoidLinkTitle(doc);
    if (!dbTitle) {
        return;
    }
    const prefix = './';
    const attribute = 'href';
    const selector = buildSelector(dbTitle);
    const nodes = doc.querySelectorAll(selector) || [];
    for (const node of nodes) {
        let value = node.getAttribute(attribute);
        if (value
            && (value.startsWith(`${dbTitle}#`)
                || value.startsWith(`${prefix}${dbTitle}#`))) {

            value = value.replace(`${dbTitle}#`, '#').replace(`${prefix}#`, '#');
            node.setAttribute(attribute, value);
        }
    }
};
