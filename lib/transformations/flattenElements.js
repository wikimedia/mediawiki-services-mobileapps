'use strict';

/**
 * Replace all elements in Document `content` that match the
 * css selector, replacing them with span tags.
 * @param {!Document} content
 * @param {string} selector
 */
function flattenElements(content, selector) {
    const elements = content.querySelectorAll(selector);
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const replacementSpan = content.createElement('span');
        replacementSpan.innerHTML = element.innerHTML;
        if (element.getAttribute('class')) {
            replacementSpan.setAttribute('class', element.getAttribute('class'));
        }
        element.parentNode.replaceChild(replacementSpan, element);
    }
}

module.exports = flattenElements;
