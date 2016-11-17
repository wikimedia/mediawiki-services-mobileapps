'use strict';

const transforms = require('./transforms');
const a = require('./anchorencode');

function parse(sectionDiv, startingNode) {
    let node = startingNode,
        nextNode;
    const nextSection = {};
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
