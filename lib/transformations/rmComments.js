'use strict';

const NodeType = require('../nodeType');

function rmComments(node) {
    for (let n = 0; n < node.childNodes.length; n++) {
        const child = node.childNodes[n];
        if (child.nodeType === NodeType.COMMENT_NODE) {
            node.removeChild(child);
            n--;
        } else if (child.nodeType === NodeType.ELEMENT_NODE) {
            rmComments(child);
        }
    }
}

module.exports = rmComments;
