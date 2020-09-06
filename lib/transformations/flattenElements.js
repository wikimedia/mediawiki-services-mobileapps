'use strict';

const DEFAULT_KEEP_ATTRIBUTES = [ 'class', 'style' ];

/**
 * @param {!Element} element the element to copy attributes from
 * @param {!Array<string>} nameArray an array of attribute names
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
 * Removes classes from the class attribute
 */
function dropClasses(element, classesArray) {
    classesArray.forEach((clazz) => {
        if (element.classList) {
            element.classList.remove(clazz);
        }
    });
}

/**
 * Copies only select attributes from one DOM element to another.
 *
 * @param {!Element} oldElement the element to copy attributes from
 * @param {!Element} newElement the element to copy attributes to
 * @param {!string[]} nameArray an array of attribute names
 */
function copyAttributes(oldElement, newElement, nameArray) {
    nameArray.forEach((name) => {
        if (oldElement.getAttribute(name)) {
            newElement.setAttribute(name, oldElement.getAttribute(name));
        }
    });
}

function createReplacementNode(oldElement, document, keepAttributes) {
    if (hasAttribute(oldElement, keepAttributes) || oldElement.querySelectorAll('*').length) {
        const spanElement = document.createElement('span');
        spanElement.innerHTML = oldElement.innerHTML;
        copyAttributes(oldElement, spanElement, keepAttributes);
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
 *
 * @param {!Document} document Document from domino
 * @param {!string} selector selector for elements to flatten
 * @param {?string[]} keepAttributesArray attributes to preserve in flattened elements
 * @param {?string[]} dropClassesArray an array of class names to remove, only makes sense
 *                    if class is kept.
 */
module.exports = (document, selector, keepAttributesArray = DEFAULT_KEEP_ATTRIBUTES,
    dropClassesArray = []) => {

    const elements = document.querySelectorAll(selector);
    for (let i = elements.length - 1; i >= 0; i--) {
        const oldElement = elements[i];
        dropClasses(oldElement, dropClassesArray);
        const newNode = createReplacementNode(oldElement, document,
            keepAttributesArray, dropClassesArray);
        oldElement.parentNode.replaceChild(newNode, oldElement);
    }
};
