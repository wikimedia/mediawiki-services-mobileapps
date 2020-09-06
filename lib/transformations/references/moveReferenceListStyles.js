'use strict';

/**
 * Moves <style> tags inside reference lists outside of them since older versions of the Android app
 * have trouble parsing them (T206527). These usually come from Template Styles used by the
 * citation template, e.g. on enwiki. (Probably on other wikis, too.)
 *
 * @param {!Document} document Parsoid DOM document
 * @return {void}
 */
module.exports = (document) => {
    const alreadyMoved = {};
    const refLists = Array.from(document.body.querySelectorAll('ol.mw-references'));
    for (const refList of refLists) {
        const styleElements = Array.from(refList.querySelectorAll('style'));
        // styleElements.forEach((styleElement) => {
        for (const styleElement of styleElements) {
            const templateStyleRef = styleElement.getAttribute('data-mw-deduplicate');
            if (templateStyleRef && !alreadyMoved[templateStyleRef]) {
                // move to end of doc
                document.body.appendChild(styleElement);
                alreadyMoved[templateStyleRef] = true;
            } else {
                // remove style
                styleElement.parentNode.removeChild(styleElement);
            }
        }
    }
};
