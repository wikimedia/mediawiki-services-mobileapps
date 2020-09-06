'use strict';

const NodeType = require('../../nodeType');

/**
 * Strips the IPA text frequently used in German articles.
 *
 * @param {!Element} root the element to search for IPAs
 */
module.exports = (root) => {
    const ipaAnchors = root.querySelectorAll('span.IPA > a[href="./Liste_der_IPA-Zeichen"]') || [];
    for (let idx = 0; idx < ipaAnchors.length; idx++) {
        const ipaAnchor = ipaAnchors[idx];
        let elementToDelete = ipaAnchor.parentElement;
        let prevNode = elementToDelete.previousSibling;
        if (!prevNode) { // try one more time with the parent
            elementToDelete = elementToDelete.parentElement;
            prevNode = elementToDelete.previousSibling;
        }
        let nextNode = elementToDelete.nextSibling;
        if (prevNode && nextNode) {
            if (prevNode.nodeType === NodeType.ELEMENT_NODE && prevNode.lastChild) {
                prevNode = prevNode.lastChild;
            }
            if (nextNode.nodeType === NodeType.ELEMENT_NODE && nextNode.firstChild) {
                nextNode = nextNode.firstChild;
            }
            if (prevNode.nodeType === NodeType.TEXT_NODE
                && prevNode.textContent.endsWith('[')
                && nextNode.nodeType === NodeType.TEXT_NODE
                && nextNode.textContent.startsWith(']')) {

                prevNode.textContent = prevNode.textContent.slice(0, -1); // rm '[' at end
                nextNode.textContent = nextNode.textContent.slice(1); // rm ']' at start
                elementToDelete.parentNode.removeChild(elementToDelete);
            }
        }
    }
};
