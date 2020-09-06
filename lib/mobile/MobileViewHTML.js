'use strict';

const pagelib = require('../../pagelib/build/wikimedia-page-library-transform');
const HTMLUtil = pagelib.HTMLUtilities;

const TEXT_DIRECTION = 'ltr';

/**
 * Creates a single meta element with property and content
 *
 * @param {!Document} document DOM document
 * @param {!string} property name of the meta property
 * @param {!string} content value of the meta property
 * @return {void}
 */
function createMetaElement(document, property, content) {
    const element = document.createElement('meta');
    element.setAttribute('property', property);
    element.setAttribute('content', content);
    return element;
}

/**
 * Adds a single link to a CSS stylesheet to html/head
 *
 * @param {Document} document DOM document
 * @param {!object} mobileview response body from action=mobileview
 * @param {!object} metadata metadata object with the following properties:
 *   {?string} baseURI base URI for common links
 *   {?string} domain domain name of wiki
 *   {?object} mw mediawiki metadata
 * @return {void}
 */
function addParsoidHead(document, mobileview, metadata) {
    const normalizedtitle = metadata
        && metadata.mw
        && metadata.mw.normalizedtitle;

    if (mobileview) {
        document.documentElement.setAttribute('about',
            `http://${metadata.domain}/wiki/Special:Redirect/revision/${mobileview.revision}`);
    }

    const charset = document.createElement('meta');
    charset.setAttribute('charset', 'utf-8');

    const head = document.head;
    if (!head) {
      return;
    }

    /* DOM sink status: safe - content from mwapi response */
    head.appendChild(createMetaElement(document, 'mw:pageNamespace', mobileview.ns));
    /* DOM sink status: safe - content from mwapi response */
    head.appendChild(createMetaElement(document, 'mw:pageId', mobileview.id));
    /* DOM sink status: safe - content from mwapi response */
    head.appendChild(createMetaElement(document, 'dc:modified', mobileview.lastmodified));
    const isVersionOf = document.createElement('link');
    isVersionOf.setAttribute('rel', 'dc:isVersionOf');
    isVersionOf.setAttribute('href', `//${metadata.domain}/wiki/${encodeURIComponent(normalizedtitle)}`);
    /* DOM sink status: safe - content from mwapi response */
    head.appendChild(isVersionOf);

    /* DOM sink status: safe - content from mwapi response */
    head.querySelector('title').innerHTML = mobileview.displaytitle;

    const base = document.createElement('base');
    base.setAttribute('href', `//${metadata.domain}/wiki/`);
    /* DOM sink status: safe - content from mwapi response */
    head.appendChild(base);
}

function wrapImagesInFigureElements(document) {
    Array.from(document.querySelectorAll('a.image')).forEach((imageLink) => {
        const figureElement = document.createElement('figure');
        figureElement.className = 'mw-default-size';
        /* DOM sink status: safe - content from parsoid output */
        figureElement.innerHTML = imageLink.outerHTML;
        /* DOM sink status: safe  - content from parsoid output */
        imageLink.parentNode.replaceChild(figureElement, imageLink);
    });
}

function createHeadingHTML(document, section) {
    const level = section.toclevel + 1;
    return `<h${level} id="${HTMLUtil.escape(section.anchor)}">${section.line}</h${level}>`;
}

function buildSection(document, section) {
    const element = document.createElement('section');
    element.setAttribute('data-mw-section-id', section.id);
    if (section.id === 0) {
        element.setAttribute('id', 'content-block-0');
        /* DOM sink status: safe - content from parsoid output */
        element.innerHTML = section.text;
    } else {
        /* DOM sink status: safe - content from parsoid output */
        element.innerHTML = `${createHeadingHTML(document, section)}${section.text}`;
    }
    return element;
}

/**
 * Opposite of rewriteUrlAttribute
 */
function rewriteWikiLinks(element, selector, ...attributes) {
    const ps = element.querySelectorAll(selector) || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const node = ps[idx];
        attributes.forEach((attribute) => {
            let value = node.getAttribute(attribute);
            if (value) {
                value = value.replace(/^\/wiki\//, './');
                node.setAttribute(attribute, value);
            }
        });
    }
}

/**
 * Scan the DOM for reference lists and wrap them in a div to be closer to the Parsoid DOM.
 *
 * @param {!Document} document
 */
function wrapReferenceListsLikeParsoid(document) {
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
        /* DOM sink status: safe - content not from user input */
        refList.parentNode.replaceChild(wrapInner, refList);
        /* DOM sink status: safe  - content not from user input */
        wrapInner.appendChild(refList);
    }
}

/**
 * Creates a Parsoid document from the MobileView response
 *
 * @param {!Document} document DOM document to insert into
 * @param {!object} mobileview mobileview response
 * @param {!object} metadata metadata object with the following properties:
 *   {?string} baseURI base URI for common links
 *   {?string} domain domain name of wiki
 *   {?object} mw mediawiki metadata
 * @return {void}
 */
function convertToParsoidDocument(document, mobileview, metadata) {
    addParsoidHead(document, mobileview, metadata);

    const content = document.body;

    // add dir property T229984
    content.setAttribute('dir', TEXT_DIRECTION);

    for (const section of mobileview.sections) {
        /* DOM sink status: safe - content from parsoid output */
        content.appendChild(buildSection(document, section));
    }

    rewriteWikiLinks(content, 'a', 'href');
    wrapImagesInFigureElements(document);
    wrapReferenceListsLikeParsoid(document);
    return document;
}

module.exports = {
    convertToParsoidDocument,
    testing: {
        buildSection,
        rewriteWikiLinks,
        wrapImagesInFigureElements,
    }
};
