"use strict";

/*
    See https://phabricator.wikimedia.org/T170690
    Turns reference list content into a JSON structure.
*/

const _ = require('underscore');
const NodeType = require('../nodeType');
const CITATION_TYPES = [ 'web', 'news', 'journal', 'book' ];

const hasOnlyWhitespace = node =>
    node.nodeType === NodeType.TEXT_NODE && /^\s*$/.test(node.textContent);

const buildBackLinkObject = (element) => {
    return {
        href: element.getAttribute('href'),
        text: _.escape(element.textContent.trim())
    };
};

const structureBackLinks = (listItemElement, logger) => {
    const resultArray = [];
    const element = listItemElement.firstElementChild;
    if (element.tagName === 'A') {
        // single back link directly
        resultArray.push(buildBackLinkObject(element));
    } else if (element.tagName === 'SPAN') {
        // multiple back links inside a <span>

        // TODO: check with domino guys if we should use a different API here.
        // https://github.com/fgnass/domino/blob/master/CHANGELOG.md
        const spanChildElements = element.children;
        for (let i = 0; i < spanChildElements.length; i++) {
            const spanChildEl = spanChildElements[i];
            if (spanChildEl.tagName === 'A') {
                resultArray.push(buildBackLinkObject(spanChildEl));
            }
        }
    } else {
        logger.log('warn', `unexpected child tag in back link: ${element.tagName}`);
    }
    return resultArray;
};

const collectCitationsOfOneCiteElement = (citations, citeElement) => {
    const classes = citeElement.classList;
    for (let k = 0; k < classes.length; k++) {
        if (classes[k] !== 'citation') {
            citations.add(classes[k]);
        }
    }
};

const addCitationsToContent = (citations, searchElement) => {
    if (searchElement.tagName === 'CITE') {
        collectCitationsOfOneCiteElement(citations, searchElement);
    } else {
        const citeElements = searchElement.querySelectorAll('cite');
        for (let i = 0; i < citeElements.length; i++) {
            collectCitationsOfOneCiteElement(citations, citeElements[i]);
        }
    }
};

const addHtmlToContent = (content, html) => {
    content.html = content.html ? content.html + html : html;
};

const getCitationType = (citations) => {
    if (citations.size === 1) {
        const value = citations.values().next().value;
        if (CITATION_TYPES.includes(value)) {
            return value;
        }
    }
    return 'generic';
};

/**
 * Returns reference content in an html string and citations set.
 * @param {!Element} spanElement 'span.mw-reference-text'
 * @return {!Object} of {html, citations}.
 */
const getReferenceContent = (spanElement) => {
    const childNodes = spanElement.childNodes;
    const content = { html: '', citations: new Set() };
    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (hasOnlyWhitespace(node)) {
            continue;
        }

        addHtmlToContent(content, node.outerHTML || _.escape(node.textContent));
        if (node.nodeType === NodeType.ELEMENT_NODE) {
            addCitationsToContent(content.citations, node);
        }
    }

    content.type = getCitationType(content.citations);
    delete content.citations;
    return content;
};

const getCiteNoteId = (listItemElement) => {
    const id = listItemElement.getAttribute('id');
    return id && id.replace(/^cite_note-/, '');
};

/**
 * Builds the object structure of a single reference.
 * @param {!Element} listItemElement content for a single reference
 * @param {!Logger} logger a logger instance associated with the request
 * @return {id, back_links, content}
 */
const buildOneReferenceItem = (listItemElement, logger) => {
    let backLinks = [];
    let content = {};

    let element = listItemElement.firstElementChild;
    while (element) {
        if (element.getAttribute('rel') === 'mw:referencedBy') {
            backLinks = structureBackLinks(listItemElement, logger);
        } else if (element.tagName === 'SPAN' && element.classList.contains('mw-reference-text')) {
            content = getReferenceContent(element);
        } else {
            logger.log('warn', `unexpected child tag in ref text: ${element.outerHTML}`);
        }
        element = element.nextElementSibling;
    }

    return {
        id: getCiteNoteId(listItemElement),
        back_links: backLinks,
        content: content.html,
        type: content.type
    };
};

/**
 * Builds an object structure for a single reference list.
 * @param {!Element} refListElement a DOM element with content for one reference list
 * @param {!Logger} logger a logger instance associated with the request
 * @return {Object} an object with order (an array of reference ids) and references
 */
const buildReferenceList = (refListElement, logger) => {
    const orderArray = [];
    const references = {};
    const children = refListElement.children;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.tagName === 'LI') {
            const referenceItem = buildOneReferenceItem(node, logger);
            orderArray.push(referenceItem.id);
            references[referenceItem.id] = referenceItem;
            delete referenceItem.id;
        } else if (hasOnlyWhitespace(node)) {
            // ignore white space
            logger.log('warn', `ignore white space: ${node.outerHTML}`);
        } else {
            logger.log('warn', `unexpected child tag: ${node.tagName}`);
        }
    }
    return { order: orderArray, references };
};

module.exports = {
    buildReferenceList,
    unit: {
        structureBackLinks,
        getReferenceContent,
        buildOneReferenceItem
    }
};
