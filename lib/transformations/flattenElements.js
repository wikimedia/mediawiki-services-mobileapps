'use strict';

const KEEP_ATTRIBUTE = 'class';

/**
 * Copies only select attributes from one DOM element to another.
 * @param {!Element} oldElement the element to copy attributes from
 * @param {!Element} newElement the element to copy attributes to
 * @param {!String} name the name of the attribute
 */
function copyAttribute(oldElement, newElement, name) {
    if (oldElement.getAttribute(name)) {
        newElement.setAttribute(name, oldElement.getAttribute(name));
    }
}

function createReplacementNode(oldElement, document) {
    if (oldElement.getAttribute(KEEP_ATTRIBUTE)) {
        const spanElement = document.createElement('span');
        spanElement.innerHTML = oldElement.innerHTML;
        copyAttribute(oldElement, spanElement, KEEP_ATTRIBUTE);
        return spanElement;
    } else {
        return document.createTextNode(oldElement.innerHTML);
    }
}

/**
 * Replaces all elements in the given Document which match the
 * CSS selector, replacing them with span tags or text.
 * If the resulting span tag doesn't have any attributes then
 * the element is replaced with a TextNode of the same content.
 * The main purpose of this is to disable certain <a> tags.
 * @param {!Document} document
 * @param {string} selector
 */
function flattenElements(document, selector) {
    const elements = document.querySelectorAll(selector);
    for (let i = 0; i < elements.length; i++) {
        const oldElement = elements[i];
        const newNode = createReplacementNode(oldElement, document);
        oldElement.parentNode.replaceChild(newNode, oldElement);
    }
}

module.exports = flattenElements;
