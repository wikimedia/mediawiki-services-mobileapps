'use strict';

/*
 * Extracts the first infobox from an article
 * @param {!Document} doc representing article
 * @return {String[]} representing infobox html
 */
function extractInfobox(doc) {
    let infobox;
    const node = doc.querySelector('.infobox');
    if (node) {
        infobox = `<table class="${node.getAttribute('class')}">${node.innerHTML}</table>`;
        // delete it
        node.parentNode.removeChild(node);
    }
    return infobox;
}

module.exports = extractInfobox;
