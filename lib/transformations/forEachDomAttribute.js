'use strict';

/**
 * Iterates over all attributes of all DOM elements.
 *
 * @param {Element} root root DOM element to start walking the DOM tree
 * @param {Function} operation a function which accepts two parameters:
 *                   an Element and an attribute as parameters
 *
 * Note: You can use the domino.Attribute accessors (localName, data, ...)
 */
module.exports = (root, operation) => {
    const elements = root.querySelectorAll('*') || [];
    for (let idx = 0; idx < elements.length; idx++) {
        const elem = elements[idx];
        for (let attrIndex = 0; attrIndex < elem.attributes.length; attrIndex++) {
            const attr = elem.attributes.item(attrIndex);
            operation(elem, attr);
        }
    }
};
