'use strict';

/**
 * Remove any elements matching selector from doc
 * @param {Document} doc
 * @param {string} selector
 */
module.exports = function(doc, selector) {
    const ps = doc.querySelectorAll(selector) || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const node = ps[idx];
        node.parentNode.removeChild(node);
    }
};
