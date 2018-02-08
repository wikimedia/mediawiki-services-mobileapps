'use strict';

/*
 * @param {!Document} lead
 * @param {?Boolean} [removeNodes] when true the hatnotes will be removed from the lead Document
 * @param {?Boolean} [htmlOnly] if we only want the html represenation (for *-lead backward compat)
 * @return {!String[]} where each element is the inner html of a hatnote
 */
function extractHatnotes(lead, removeNodes, htmlOnly) {
    const hatnotes = [];
    const hatnoteNodes = lead.querySelectorAll('.hatnote,.dablink');
    Array.prototype.forEach.call(hatnoteNodes, (hatnoteNode, i) => {
        if (htmlOnly) {
            hatnotes.push(hatnoteNode.innerHTML);
        } else {
            hatnotes.push({
                html: hatnoteNode.innerHTML,
                text: hatnoteNode.textContent
            });
        }
        if (removeNodes) {
            hatnoteNode.parentNode.removeChild(hatnoteNode);
        }
    });
    return hatnotes;
}

module.exports = extractHatnotes;
