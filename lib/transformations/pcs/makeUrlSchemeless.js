'use strict';

/**
 * Replace all https URLs (including js and css) with scheme-less equivalents to provide
 * permanently cached versions of files to the web view.
 * Choose a selector and an attribute to make the replace.
 * @param {!Document} document Parsoid DOM document with the lead section in a section tag
 * @param {!String} selector string selector of the element to replace its URL
 * @param {!String} attribute src or href
 */
module.exports = (document, selector, attribute) => {
    const el = document.querySelectorAll(selector) || [];
    for (var i = 0; i <= el.length; i++) {
        if (el[i]) {
            const att = el[i].getAttribute(attribute);
            if (att) {
                // Checking for URLs that has https:// and replace it with //
                el[i].setAttribute(attribute, att.replace(new RegExp('https://'), '//'));
            }
        }
    }
};
