/**
 * Common DOM transformations for mobile apps.
 * We rearrange some content and remove content that is not shown/needed.
 */

'use strict';

const _rmElementsWithSelector = require('./transformations/rmElementsWithSelector');
const _rmAttributes = require('./transformations/removeAttributes');

const anchorPopUpMediaTransforms = require('./transformations/legacy/anchorPopUpMediaTransforms');
const extractHatnotes = require('./transformations/pageextracts/extractHatnotes');
const markReferenceSections = require('./references/markReferenceSections');
const stripReferenceListContent = require('./references/stripReferenceListContent');
const extractInfobox = require('./transformations/pageextracts/extractInfobox');
const extractPageIssues = require('./transformations/pageextracts/extractPageIssues');
const extractLeadIntroduction = require('./transformations/pageextracts/extractLeadIntroduction');
const extractReferenceLists = require('./references/extractReferenceLists').extractReferenceLists;
const flattenElements = require('./transformations/flattenElements');
const pcsTransforms = require('./transformations/pcs/pcsTransforms');
const summarize = require('./transformations/summarize').summarize;
const NodeType = require('./nodeType');
const ImageSelectors = require('./selectors').ImageSelectors;
const transforms = { legacy: {}, pcs: {} };

transforms.hideRedLinks = require('./transformations/legacy/hideRedLinks');
transforms.moveReferenceListStyles
    = require('./references/moveReferenceListStyles').moveReferenceListStyles;
transforms.stripGermanIPA = require('./transformations/stripGermanIPA');

transforms._rmComments = function(node) {
    for (let n = 0; n < node.childNodes.length; n++) {
        const child = node.childNodes[n];
        if (child.nodeType === NodeType.COMMENT_NODE) {
            node.removeChild(child);
            n--;
        } else if (child.nodeType === NodeType.ELEMENT_NODE) {
            transforms._rmComments(child);
        }
    }
};

/**
 * Replaces something like "<span>[</span>1<span>]</span>" with "[1]".
 * This is one way to reduce the payload sent to the client.
 * @param {!Document} doc the DOM document to be transformed
 */
transforms._rmBracketSpans = function(doc) {
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
 * @param {!string} dbTitle the database style title of the current page following the same format
 * as provided by mwapi.getDbTitle()
 */
transforms.shortenPageInternalLinks = function(doc, dbTitle) {

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
transforms._removeRefLinkbacks = function(doc) {
    const ps = doc.querySelectorAll('span.mw-linkback-text') || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const node = ps[idx];
        const parent = node.parentNode;
        if (parent.tagName === 'A') {
            parent.parentNode.removeChild(parent);
        }
    }
};

function _addParsoidSpecificMarkup(doc) {
    _rewriteUrlAttribute(doc, 'a', 'href');

    // Set <a class="external" on all <a rel="mw:ExtLink"
    // so we get the 'external link' indicators in the UI.
    _addClassTo(doc, 'a[rel~=mw:ExtLink]', 'external');

    // Set class="image" on all anchors around images
    // so the app knows to view these images in the gallery.
    // See also https://www.mediawiki.org/wiki/Parsoid/MediaWiki_DOM_spec#Images
    _addClassTo(doc, ImageSelectors.map(selector => selector.concat(' > a')).join(), 'image');
}

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
                    step[transform].forEach(selector => _rmElementsWithSelector(doc, selector));
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
                default:
                    throw new Error(`Unrecognized processing instruction ${transform}`);
            }
        }
    });
};

transforms.addRequiredMarkup = function(doc) {
    _addParsoidSpecificMarkup(doc);
    anchorPopUpMediaTransforms.fixVideoAnchor(doc);
};

/**
 * Runs the DOM transformations for the PCS mobile-html endpoint.
 * @param {!Document} doc Parsoid DOM document
 * @param {!string} restApiBaseUri the base URI for RESTBase for the request domain,
 *        e.g. 'https://en.wikipedia.org/api/rest_v1/'
 * @param {!string} linkTitle the title of the page that can be used to link to it
 * @param {!Array} processing mobile-html processing script
 */
transforms.runPcsTransforms = function(doc, restApiBaseUri, linkTitle, processing) {
    transforms.preprocessParsoidHtml(doc, processing);
    pcsTransforms.runPcsTransforms(doc, restApiBaseUri, linkTitle);
};

transforms.rmElementsWithSelector = _rmElementsWithSelector;

// visible for testing
transforms._rmMwIdAttributes = _rmMwIdAttributes;

transforms.legacy.anchorPopUpMediaTransforms = anchorPopUpMediaTransforms;
transforms.pcs.relocateFirstParagraph = pcsTransforms.relocateFirstParagraph;
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
