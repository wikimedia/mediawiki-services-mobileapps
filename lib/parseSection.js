'use strict';

const a = require('./anchorencode');

function parse(sectionDiv, startingNode) {
    let nextNode;
    const nextSection = {};
    let node = startingNode;

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
    }
    return { sectionDiv, nextNode: node, nextSection };
}

module.exports = parse;
