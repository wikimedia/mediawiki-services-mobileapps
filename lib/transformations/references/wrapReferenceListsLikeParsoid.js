'use strict';

/**
 * Scan the DOM for reference lists and wrap them in a div to be closer to the Parsoid DOM.
 * @param {!Document} document
 */
module.exports = (document) => {
    let mwtCounter = 1000;
    const refLists = document.querySelectorAll('ol.references');
    for (const refList of refLists) {
        // add the mw-references class
        refList.classList.add('mw-references');

        // wrap in inner DIV
        const wrapInner = document.createElement('DIV');
        wrapInner.classList.add('mw-references-wrap');
        wrapInner.setAttribute('typeof', 'mw:Extension/references');
        wrapInner.setAttribute('about', `#mwt${mwtCounter++}`);
        refList.parentNode.replaceChild(wrapInner, refList);
        wrapInner.appendChild(refList);
    }
};
