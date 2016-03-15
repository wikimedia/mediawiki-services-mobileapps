'use strict';

var transforms = require('./transforms');
var a = require('./anchorencode');

function parse(sectionDiv, startingNode) {
    var node = startingNode,
        nextNode,
        nextSection = {};
    while (node) {
        if (!(/^H[2-6]$/.test(node.tagName))) {
            nextNode = node.nextSibling;
            sectionDiv.appendChild(node);
            node = nextNode;
            continue;
        } else {
            nextSection.toclevel = parseInt(node.tagName.charAt(1)) - 1;
            nextSection.line = node.innerHTML.trim();
            nextSection.anchor = a.anchorencode(nextSection.line);
            node = node.nextSibling;
            break;
        }
        node = node.nextSibling;
    }
    return { sectionDiv: sectionDiv, nextNode: node, nextSection: nextSection};
}

module.exports = parse;
