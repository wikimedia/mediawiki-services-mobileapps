"use strict";

/**
 * Scan the DOM for reference lists and replace its contents with a placeholder div.
 * @param {!Document} doc to scan for references
 */
function stripReferenceListContent(doc) {
    const refLists = doc.querySelectorAll('*[typeof=\'mw:Extension/references\']');
    for (const refList of refLists) {
        const placeholder = doc.createElement('DIV');
        placeholder.classList.add('mw-references-placeholder');
        refList.parentNode.replaceChild(placeholder, refList);
    }
}

module.exports = stripReferenceListContent;
