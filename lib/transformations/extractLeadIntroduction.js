'use strict';

/*
 * Check whether a node has any content.
 * @param {!DOMElement} node
 * @return {!Boolean} whether the node is empty after all whitespace is stripped.
 */
function isEmpty(node) {
    return node.textContent.trim().length === 0;
}

/*
 * Extracts the first non-empty paragraph from an article and any
 * nodes that follow it that are not themselves paragraphs.
 * Removes the paragraph from the document.
 * @param {!Document} doc representing article
 * @return {String} representing article introduction
 */
function extractLeadIntroduction(doc) {
    let p = '';
    const remove = [];
    const blacklist = [ 'P', 'TABLE' ];
    const nodes = doc.querySelectorAll('body > p');

    Array.prototype.forEach.call(nodes, (node) => {
        let nextSibling;
        if (!p && node && !isEmpty(node)) {
            p = node.outerHTML;
            remove.push(node);
            nextSibling = node.nextSibling;
            // check the next element is a text node or not in list of blacklisted elements
            while (nextSibling && (nextSibling.nodeType === 3 ||
                blacklist.indexOf(nextSibling.tagName) === -1
            )) {
                // Deal with text nodes
                if (nextSibling.nodeType === 3) {
                    if (!isEmpty(nextSibling)) {
                        p += nextSibling.textContent;
                    }
                } else {
                    p += nextSibling.outerHTML;
                }
                remove.push(nextSibling);
                nextSibling = nextSibling.nextSibling;
            }
        }
    });
    // cleanup all the nodes.
    remove.forEach((node) => {
        node.parentNode.removeChild(node);
    });
    return p;
}

module.exports = extractLeadIntroduction;
