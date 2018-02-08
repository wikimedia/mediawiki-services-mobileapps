'use strict';

/*
 * @param {!Document} lead
 * @param {?Boolean} [removeNodes] when true the hatnotes will be removed from the lead Document
 * @return {!String[]} where each element is the inner html of a hatnote
 */
function extractHatnotes(lead, removeNodes) {
    const hatnotes = [];
    const hatnoteNodes = lead.querySelectorAll('.hatnote,.dablink');
    Array.prototype.forEach.call(hatnoteNodes, (hatnoteNode, i) => {
        hatnotes.push(hatnoteNode.innerHTML);
        if (removeNodes) {
            hatnoteNode.parentNode.removeChild(hatnoteNode);
        }
    });
    return hatnotes;
}

module.exports = extractHatnotes;
