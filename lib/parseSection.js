'use strict';

var transforms = require('./transforms');
var a = require('./anchorencode');

function parse(startingNode) {
    var node = startingNode,
        text = '',
        nextSection = {};
    while (node) {
        if (node.nodeType === transforms.NodeType.TEXT) {
            text = text + node.nodeValue;
            node = node.nextSibling;
            continue;
        } else if (/^H[2-6]$/.test(node.tagName)) { // heading tag
            nextSection.toclevel = parseInt(node.tagName.charAt(1)) - 1;
            nextSection.line = node.innerHTML.trim();
            nextSection.anchor = a.anchorencode(nextSection.line);
            node = node.nextSibling;
            break;
        }

        if (node.outerHTML) { // had some "undefined" values creeping into the output without this check
            text = text + node.outerHTML;
        }
        node = node.nextSibling;
    }
    return { text: text.trim(), nextNode: node, nextSection: nextSection};
}

module.exports = parse;
