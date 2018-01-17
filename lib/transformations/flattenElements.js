'use strict';

const KEEP_ATTRIBUTES = [ 'class', 'style' ];

/**
 * @param {!Element} element the element to copy attributes from
 * @param {!Array<String>} nameArray an array of attribute names
 * @return {boolean} true if at least one of the attribute names exist
 *         on the element false otherwise.
 */
function hasAttribute(element, nameArray) {
    for (let i = 0; i < nameArray.length; i++) {
        if (element.getAttribute(nameArray[i])) {
            return true;
        }
    }
    return false;
}

/**
 * Copies only select attributes from one DOM element to another.
 * @param {!Element} oldElement the element to copy attributes from
 * @param {!Element} newElement the element to copy attributes to
 * @param {!Array<String>} nameArray an array of attribute names
 */
function copyAttributes(oldElement, newElement, nameArray) {
    nameArray.forEach((name) => {
        if (oldElement.getAttribute(name)) {
            newElement.setAttribute(name, oldElement.getAttribute(name));
        }
    });
}

function createReplacementNode(oldElement, document) {
    if (hasAttribute(oldElement, KEEP_ATTRIBUTES) || oldElement.querySelectorAll('*').length) {
        const spanElement = document.createElement('span');
        spanElement.innerHTML = oldElement.innerHTML;
        copyAttributes(oldElement, spanElement, KEEP_ATTRIBUTES);
        return spanElement;
    } else {
        return document.createTextNode(oldElement.textContent);
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
