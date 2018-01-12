"use strict";

const domino = require('domino');
const flattenElements = require('./flattenElements');
const rmElementsWithSelector = require('./rmElementsWithSelector');
const removeAttributes = require('./removeAttributes');
const NodeType = require('../nodeType');

const DISALLOWED_ELEMENTS = ['OBJECT', 'SCRIPT', 'STYLE'];
const ALLOWED_ATTRIBUTES = ['class', 'style'];

const ANY_PAREN_REGEX = /[()（）]/;

/**
 * Removes blacklisted elements.
 * @param {!Node} node the node to visit
 */
function rmDisallowedElements(node) {
    if (DISALLOWED_ELEMENTS.includes(node.tagName)) {
        node.remove();
    }
}

function nameAllowed(tagName, attributeName) {
    // every attribute in <img> or in ALLOWED_ATTRIBUTES
    return tagName === 'IMG' || ALLOWED_ATTRIBUTES.includes(attributeName);
}

function valueDisallowed(value) {
    return ANY_PAREN_REGEX.test(value);
}

/**
 * Removes attributes except white-listed ones.
 * @param {!Node} node the node to visit
 * @param {!String} tagName the uppercase tag name of the DOM element
 */
function rmUnwantedAttributes(node, tagName) {
    const attrs = node.attributes;
    for (let i = attrs.length - 1; i >= 0; i--) {
        const attribute = attrs.item(i);
        if (!nameAllowed(tagName, attribute.localName) || valueDisallowed(attribute.data)) {
            node.removeAttribute(attribute.localName);
        }
    }
}

/**
 * Visits one DOM node. Do the stuff that needs to be done when a single DOM node is handled.
 * In this case, remove DOM nodes and some attributes we don't want to keep.
 * @param {!Node} node the node to visit
 */
function visit(node) {
    if (node.nodeType === NodeType.ELEMENT_NODE) {
        rmDisallowedElements(node);
        rmUnwantedAttributes(node, node.tagName);
    } else if (node.nodeType !== NodeType.TEXT_NODE) {
        node.remove();
    }
}

/**
 * Traverses DOM tree iteratively (depth first).
 * @param {!Element} rootElement the root of the DOM tree which needs to be traversed
 */
function traverseDF(rootElement) {
    let nodesToVisit = [ rootElement ];
    while (nodesToVisit.length > 0) {
        const currentNode = nodesToVisit.shift();
        visit(currentNode);
        nodesToVisit = [
            ...(currentNode.childNodes || []), // depth first
            ...nodesToVisit,
        ];
    }
}

/**
 * Removes unwanted nodes and element attributes.
 * @param {!Document} document the DOM document
 */
function removeUnwantedNodes(document) {
    traverseDF(document.body);
}

/**
 * Recursively discard any parentheticals that themselves are inside parentheticals
 * @param {string} html
 * @return {string} html summary with nested parentheticals removed.
 */
function removeNestedParentheticals(html) {
    // Remove any nested parentheticals
    const regex = /(\([^()]+)(\([^()]+\))/g;
    const newHtml = html.replace(regex, '$1 ');

    if (newHtml.match(regex)) {
        return removeNestedParentheticals(newHtml);
    } else {
        return newHtml;
    }
}

/**
 * Given a chunk of HTML, create a summary of the content
 * @param {string} html
 * @return {!object} html summary
 */
module.exports = function(html) {
    const doc = domino.createDocument(html);
    flattenElements(doc, 'a');
    removeAttributes(doc, '*', ['data-mw']);
    rmElementsWithSelector(doc, '.mw-ref, .reference');
    rmElementsWithSelector(doc, '.noexcerpt');
    rmElementsWithSelector(doc, '.noprint');
    rmElementsWithSelector(doc, 'math');
    rmElementsWithSelector(doc, 'span:empty,b:empty,i:empty,p:empty');
    removeUnwantedNodes(doc);

    html = doc.body.innerHTML;
    html = removeNestedParentheticals(html);
    // 1. Replace any parentheticals which have at least one space inside
    html = html.replace(/\([^\)]+ [^\)]+\)/g, ' '); // eslint-disable-line no-useless-escape
    // 2. Remove any empty parentheticals due to transformations
    html = html.replace(/\(\)/g, ' ');

    // 3. Remove content inside any other non-latin parentheticals. The behaviour is
    // the same as 1 but for languages that are not latin based
    html = html.replace(/[（（（].+ .+[）））]/g, ' ');

    // 4. remove all double spaces created by the above
    html = html.replace(/ +/g, ' ');

    // 5. Replace any leading whitespace before commas
    html = html.replace(/ , /g, ', ');

    doc.body.innerHTML = html;
    return {
        extract: doc.body.textContent,
        extract_html: html
    };
};
