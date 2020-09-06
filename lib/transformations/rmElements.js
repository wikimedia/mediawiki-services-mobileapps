'use strict';

/**
 * Remove any elements matching selector from doc
 *
 * @param {Document} doc
 * @param {string} selector
 * @return {boolean} true if at least one node has been removed
 */
module.exports = function(doc, selector) {
    const nodes = doc.querySelectorAll(selector) || [];
    for (let idx = 0; idx < nodes.length; idx++) {
        const node = nodes[idx];
        node.parentNode.removeChild(node);
    }
    return nodes.length > 0;
};
