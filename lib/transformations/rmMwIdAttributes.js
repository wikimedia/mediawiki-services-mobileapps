'use strict';

/**
 * Removes Parsoid-generated id attributes, which start with 'mw', followed by two or three
 * characters, from certain DOM elements.
 *
 * @param {!Document} doc the DOM document
 * @private
 */
module.exports = (doc) => {
    const ps = doc.querySelectorAll('*[id^="mw"]') || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const node = ps[idx];
        // only remove ids like "mwAQA" but keep ids like "mw-reference-text-cite_note-5"
        if (/^mw[\w-]{2,3}$/.test(node.getAttribute('id'))) {
            node.removeAttribute('id');
        }
    }
};
