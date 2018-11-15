/**
 * Common DOM transformations for mobile apps.
 * We rearrange some content and remove content that is not shown/needed.
 */

'use strict';

const domUtil = require('./domUtil');

const transforms = {};

const _rmAttributes = require('./transformations/removeAttributes');

const extractHatnotes = require('./transformations/pageextracts/extractHatnotes');
const markReferenceSections = require('./references/markReferenceSections');
const stripReferenceListContent = require('./references/stripReferenceListContent');
const extractInfobox = require('./transformations/pageextracts/extractInfobox');
const extractPageIssues = require('./transformations/pageextracts/extractPageIssues');
const extractLeadIntroduction = require('./transformations/pageextracts/extractLeadIntroduction');
const extractReferenceLists = require('./references/extractReferenceLists').extractReferenceLists;
const flattenElements = require('./transformations/flattenElements');
const summarize = require('./transformations/summarize').summarize;
const NodeType = require('./nodeType');

transforms.fixVideoAnchor
    = require('./transformations/legacy/anchorPopUpMediaTransforms');
transforms.hideRedLinks = require('./transformations/legacy/hideRedLinks');
transforms.moveReferenceListStyles
    = require('./references/moveReferenceListStyles').moveReferenceListStyles;
transforms.rmElements = require('./transformations/rmElements');
transforms.stripGermanIPA = require('./transformations/stripGermanIPA');

transforms.rmComments = function(node) {
    for (let n = 0; n < node.childNodes.length; n++) {
        const child = node.childNodes[n];
        if (child.nodeType === NodeType.COMMENT_NODE) {
            node.removeChild(child);
            n--;
        } else if (child.nodeType === NodeType.ELEMENT_NODE) {
            transforms.rmComments(child);
        }
    }
};

/**
 * Replaces something like "<span>[</span>1<span>]</span>" with "[1]".
 * This is one way to reduce the payload sent to the client.
 * @param {!Document} doc the DOM document to be transformed
 */
transforms.rmBracketSpans = function(doc) {
    const ps = doc.querySelectorAll('span:not([class],[style],[id])') || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const el = ps[idx];
        if (/^(\[|\])$/.test(el.textContent)) {
            const bracket = doc.createTextNode(el.textContent);
            el.parentNode.replaceChild(bracket, el);
        }
    }
};

/**
 * Removes Parsoid-generated id attributes, which start with 'mw', followed by two or three
 * characters, from certain DOM elements.
 * @param {!Document} doc the DOM document
 * @param {!string} tagName the tag name
 * @private
 */
function _rmMwIdAttributes(doc, tagName) {
    const ps = doc.querySelectorAll(`${tagName}[id^="mw"]`) || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const node = ps[idx];
        // only remove ids like "mwAQA" but keep ids like "mw-reference-text-cite_note-5"
        if (/^mw[\w-]{2,3}$/.test(node.getAttribute('id'))) {
            node.removeAttribute('id');
        }
    }
}

/**
 * Shortens the href value of links to any anchor on the same page. This is for both links to
 * references and other links to anchors on the same page.
 * The Android app detects these if the href starts with a '#' character. A recent Parsoid change
 * added './' and the title before the '#'.
 * @param {!Document} doc DOM Document representation of the current page content
 * as provided by mwapi.getDbTitle()
 */
transforms.shortenPageInternalLinks = function(doc) {

    /**
     * Build a CSS selector that works around the Domino issue of potentially having single-quotes
     * in the selector. See https://github.com/fgnass/domino/issues/95
     * @param {!string} dbTitle the title of the current page
     * @return {!string} selector which can be used to find HTML nodes containing reference links
     */
    const buildSelector = (dbTitle) => {
        const start = 'a[href^=';
        const end = ']';
        const quoteIndex = dbTitle.search(/['"]/);
        const prefix = './';
        let selectorTitle;
        if (quoteIndex === -1) {
            // no quote found. Can use the full title.
            selectorTitle = `${dbTitle}#`;
        } else {
            // cannot use the full title :(
            selectorTitle = dbTitle.substr(0, quoteIndex);
        }
        return `${start}${prefix}${selectorTitle}${end}, ${start}${selectorTitle}${end}`;
    };

    const dbTitle = domUtil.getParsoidLinkTitle(doc);
    const prefix = './';
    const attribute = 'href';
    const selector = buildSelector(dbTitle);
    const nodes = doc.querySelectorAll(selector) || [];
    for (const node of nodes) {
        let value = node.getAttribute(attribute);
        if (value
            && (value.startsWith(`${dbTitle}#`)
                || value.startsWith(`${prefix}${dbTitle}#`))) {

            value = value.replace(`${dbTitle}#`, '#').replace(`${prefix}#`, '#');
            node.setAttribute(attribute, value);
        }
    }
};

function _rewriteUrlAttribute(doc, selector, attribute) {
    const ps = doc.querySelectorAll(selector) || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const node = ps[idx];
        let value = node.getAttribute(attribute);
        if (value) {
            value = value.replace(/^\.\//, '/wiki/');
            node.setAttribute(attribute, value);
        }
    }
}

function _addClassTo(doc, selector, className) {
    const ps = doc.querySelectorAll(selector) || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const node = ps[idx];
        node.classList.add(className);
    }
}

/**
 * Removes reference link backs.
 * Example: <a href=\"#cite_ref-1\"><span class=\"mw-linkback-text\">↑ </span></a>
 */
transforms.rmRefLinkbacks = function(doc) {
    const ps = doc.querySelectorAll('span.mw-linkback-text') || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const node = ps[idx];
        const parent = node.parentNode;
        if (parent.tagName === 'A') {
            parent.parentNode.removeChild(parent);
        }
    }
};

transforms.preprocessParsoidHtml = function(doc, script) {
    script.forEach((step) => {
        if (typeof step === 'string') {
            transforms[step](doc);
        } else {
            if (Object.keys(step).length !== 1) {
                throw new Error('Invalid processing step definition');
            }
            const transform = Object.keys(step)[0];
            switch (transform) {
                case 'rmElements':
                    step[transform].forEach(selector => transforms.rmElements(doc, selector));
                    break;
                case 'flattenElements':
                    Object.keys(step[transform]).forEach((selector) => {
                        const attrs = step[transform][selector];
                        transforms.flattenElements(doc, selector, attrs);
                    });
                    break;
                case 'rmAttributes':
                    Object.keys(step[transform]).forEach((selector) => {
                        const attrs = step[transform][selector];
                        _rmAttributes(doc, selector, attrs);
                    });
                    break;
                case 'rmMwIdAttributes':
                    step[transform].forEach(selector => _rmMwIdAttributes(doc, selector));
                    break;
                case 'rewriteUrlAttribute':
                    Object.keys(step[transform]).forEach((selector) => {
                        const attr = step[transform][selector];
                        _rewriteUrlAttribute(doc, selector, attr);
                    });
                    break;
                case 'addClassTo':
                    Object.keys(step[transform]).forEach((selector) => {
                        const className = step[transform][selector];
                        _addClassTo(doc, selector, className);
                    });
                    break;
                default:
                    throw new Error(`Unrecognized processing instruction ${transform}`);
            }
        }
    });
};

// PCS Transforms
transforms.addSectionEditButtons = require('./transformations/pcs/addSectionEditButtons');
transforms.adjustThumbWidths = require('./transformations/pcs/adjustThumbWidths');
transforms.head = require('./transformations/pcs/head');
transforms.hideRedLinks = require('./transformations/pcs/hideRedLinks');
transforms.lazyLoadImagePrep = require('./transformations/pcs/lazyLoadImagePrep');
transforms.prepForTheme = require('./transformations/pcs/prepForTheme');
transforms.relocateFirstParagraph = require('./transformations/pcs/relocateFirstParagraph');
transforms.widenImages = require('./transformations/pcs/widenImages');
transforms.addCssLinks = transforms.head.addCssLinks;
transforms.addMetaViewport = transforms.head.addMetaViewport;
transforms.addPageLibJs = transforms.head.addPageLibJs;

// visible for testing
transforms._rmMwIdAttributes = _rmMwIdAttributes;

transforms.extractHatnotesForMetadata = extractHatnotes.extractHatnotesForMetadata;
transforms.extractHatnotesForMobileSections = extractHatnotes.extractHatnotesForMobileSections;
transforms.markReferenceSections = markReferenceSections;
transforms.stripReferenceListContent = stripReferenceListContent;
transforms.extractInfobox = extractInfobox;
transforms.extractPageIssuesForMetadata = extractPageIssues.extractPageIssuesForMetadata;
// eslint-disable-next-line max-len
transforms.extractPageIssuesForMobileSections = extractPageIssues.extractPageIssuesForMobileSections;
transforms.extractLeadIntroduction = extractLeadIntroduction;
transforms.flattenElements = flattenElements;
transforms.summarize = summarize;
transforms.extractReferenceLists = extractReferenceLists;

module.exports = transforms;
