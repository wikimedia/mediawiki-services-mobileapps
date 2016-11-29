/**
 * DOM transformation shared with app. Let's keep this in sync with the app.
 * Last sync: Android repo 3d5b441 www/js/transforms/hideRedLinks.js
 *
 * The main change from the original Android app file is to use
 * content.createElement() instead of document.createElement().
 */

'use strict';

function hideRedLinks(content) {
    const redLinks = content.querySelectorAll('a.new');
    for (let i = 0; i < redLinks.length; i++) {
        const redLink = redLinks[i];
        const replacementSpan = content.createElement('span');
        replacementSpan.innerHTML = redLink.innerHTML;
        replacementSpan.setAttribute('class', redLink.getAttribute('class'));
        redLink.parentNode.replaceChild(replacementSpan, redLink);
    }
}

module.exports = {
    hideRedLinks
};
