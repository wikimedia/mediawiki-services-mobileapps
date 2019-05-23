'use strict';

const NodeType = require('../nodeType');

function rmComments(node) {
    let child = node.firstChild;
    while (child) {
        const type = child.nodeType;
        child = child.nextSibling;
        if (type === NodeType.COMMENT_NODE) {
            node.removeChild(child ? child.previousSibling : node.lastChild);
        } else if (type === NodeType.ELEMENT_NODE) {
            rmComments(child ? child.previousSibling : node.lastChild);
        }
    }
}

module.exports = rmComments;
