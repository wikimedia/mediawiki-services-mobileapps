/**
 * Common DOM transformations for mobile apps.
 * We rearrange some content and remove content that is not shown/needed.
 */

'use strict';

const domino = require('domino');
const rmElementsWithSelector = require('./transformations/rmElementsWithSelector');
const anchorPopUpMediaTransforms = require('./transformations/anchorPopUpMediaTransforms');
const hideRedLinks = require('./transformations/hideRedLinks');
const hideIPA = require('./transformations/hideIPA');
const extractHatnotes = require('./transformations/extractHatnotes');
const markReferenceSections = require('./references/markReferenceSections');
const stripReferenceListContent = require('./references/stripReferenceListContent');
const relocateFirstParagraph = require('./transformations/relocateFirstParagraph');
const extractInfobox = require('./transformations/extractInfobox');
const extractPageIssues = require('./transformations/extractPageIssues');
const extractLeadIntroduction = require('./transformations/extractLeadIntroduction');
const extractReferenceLists = require('./references/extractReferenceLists');
const flattenElements = require('./transformations/flattenElements');
const summarize = require('./transformations/summarize');
const _rmAttributes = require('./transformations/removeAttributes');
const NodeType = require('./nodeType');
const ImageSelectors = require('./selectors').ImageSelectors;
const transforms = {};


function _rmComments(node) {
    for (let n = 0; n < node.childNodes.length; n++) {
        const child = node.childNodes[n];
        if (child.nodeType === NodeType.COMMENT_NODE) {
            node.removeChild(child);
            n--;
        } else if (child.nodeType === NodeType.ELEMENT_NODE) {
            _rmComments(child);
        }
    }
}

function _rmElementsWithSelectors(doc, selectors) {
    const elems = doc.querySelectorAll(selectors.join(','));
    for (let j = 0; j < elems.length; j++) {
        const elem = elems[j];
        elem.parentNode.removeChild(elem);
    }
}

/**
 * Replaces something like "<span>[</span>1<span>]</span>" with "[1]".
 * This is one way to reduce the payload sent to the client.
 * @param {!Document} doc the DOM document to be transformed
 */
function _rmBracketSpans(doc) {
    const ps = doc.querySelectorAll('span:not([class],[style],[id])') || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const node = ps[idx];
        if (/^\[|]$/.test(node.innerHTML)) {
            const bracket = doc.createTextNode(node.innerHTML);
            node.parentNode.replaceChild(bracket, node);
        }
    }
}

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
        if (/^mw\w{2,3}$/.test(node.getAttribute('id'))) {
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
function _removeRefLinkbacks(doc, selector, className) {
    const ps = doc.querySelectorAll('span.mw-linkback-text') || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const node = ps[idx];
        const parent = node.parentNode;
        if (parent.tagName === 'A') {
            parent.parentNode.removeChild(parent);
        }
    }
}

function _removeUnwantedElements(doc, selectors) {
    _rmElementsWithSelectors(doc, selectors);
    _rmBracketSpans(doc);
    _rmComments(doc);
}

function _addParsoidSpecificMarkup(doc) {
    _rewriteUrlAttribute(doc, 'a', 'href');

    // Set <a class=\'external\"
    // on all <a rel=\"mw:ExtLink\"
    // so we get the 'external link' indicators in the UI.
    _addClassTo(doc, 'a[rel~=mw:ExtLink]', 'external');

    // Set class="image"
    // on all anchors around images
    // so the app knows to view these images in the gallery.
    // See also https://www.mediawiki.org/wiki/Parsoid/MediaWiki_DOM_spec#Images
    _addClassTo(doc, ImageSelectors.map(selector => selector.concat(' > a')).join(), 'image');
}

function _applyOptionalParsoidSpecificTransformations(doc, references) {
    const figureInlineAttributes = ['about', 'data-file-type', 'data-mw', 'itemscope',
        'itemtype', 'lang', 'title', 'typeof'];
    if (references) {
        _rmAttributes(doc, 'a:not([rel=nofollow],[rel~=mw:ExtLink],[rel~=mw:referencedBy])',
            ['rel']);
        _rmAttributes(doc, 'ol', ['data-mw']);
    } else {
        _rmAttributes(doc, 'a:not([rel=nofollow],[rel~=mw:ExtLink])',
            ['rel']);
        _rmAttributes(doc, 'ol', ['about', 'data-mw', 'typeof']);
        figureInlineAttributes.push('rel');
    }

    _rmAttributes(doc, 'a', ['about', 'data-mw', 'typeof']);
    _rmAttributes(doc, 'code', ['about', 'data-mw', 'typeof']);
    _rmAttributes(doc, 'div', ['about', 'data-mw', 'typeof']);
    _rmAttributes(doc, 'p', ['about', 'data-mw', 'typeof']);
    _rmAttributes(doc, 'ul', ['about', 'data-mw', 'typeof']);
    _rmAttributes(doc, 'table', ['about', 'data-mw', 'typeof']);
    _rmAttributes(doc, 'blockquote', ['about', 'data-mw', 'typeof']);
    _rmAttributes(doc, 'cite', ['about', 'data-mw', 'typeof']);
    _rmAttributes(doc, 'abbr', ['title']);
    _rmAttributes(doc, 'figure', ['typeof']);
    _rmAttributes(doc, 'figcaption a[class~=image]', ['class']); // T123527
    _rmAttributes(doc, 'i', ['about', 'data-mw', 'typeof']);
    _rmAttributes(doc, 'li', ['about']);
    _rmAttributes(doc, 'img', ['about', 'alt', 'data-file-height', 'data-file-width',
        'resource']);
    _rmAttributes(doc, 'figure-inline', figureInlineAttributes);
    _rmAttributes(doc, 'span', figureInlineAttributes);
    _rmAttributes(doc, 'sup', ['about', 'rel', 'typeof', 'data-mw']);

    _rmMwIdAttributes(doc, 'a[href]');
    _rmMwIdAttributes(doc, 'b');
    _rmMwIdAttributes(doc, 'blockquote');
    _rmMwIdAttributes(doc, 'code');
    _rmMwIdAttributes(doc, 'div');
    _rmMwIdAttributes(doc, 'em');
    _rmMwIdAttributes(doc, 'figcaption');
    _rmMwIdAttributes(doc, 'i');
    _rmMwIdAttributes(doc, 'img');
    _rmMwIdAttributes(doc, 'li');
    _rmMwIdAttributes(doc, 'ol');
    _rmMwIdAttributes(doc, 'p');
    _rmMwIdAttributes(doc, 'q');
    _rmMwIdAttributes(doc, 'ul');
    _rmMwIdAttributes(doc, 'span');
    _rmMwIdAttributes(doc, 'td');
    _rmMwIdAttributes(doc, 'figure-inline');
}

/**
 * Nukes stuff from the DOM we don't want.
 */
function _runAllSectionsTransforms(doc, legacy) {
    const rmSelectors = [
        'span.Z3988',                      // Remove bibliographic metadata
        'span:empty',                      // Remove empty <span></span>
        'link',
        '#coordinates',
        'table.navbox',
        '.geo-nondefault',
        '.geo-multi-punct',
        '.hide-when-compact',
        'div.infobox',
        'div.magnify'
    ];

    _removeUnwantedElements(doc, rmSelectors);

    if (legacy) {
        // Remove reference link backs since we don't want them to appear in the reference dialog;
        // they are not needed.
        _removeRefLinkbacks(doc);
    }
}

/**
 * Destructive, non-Parsoid-specific transforms previously performed in the app.
 */
function _removeUnwantedWikiContentForApp(doc, legacy) {
    hideRedLinks(doc);
    hideIPA.hideIPA(doc, legacy);
}

// /**
// * Nukes stuff from the lead section we don't want.
// */
// function runLeadSectionTransforms(doc) {
//    // TODO: once Parsoid produces <section> tags this should be easier.
//
//    //var rmElementsWithSelectors = [
//    //    'div.hatnote'
//    //];
//    //removeUnwantedElements(doc, rmElementsWithSelectors);
// }

/**
 * Remove Wiktionary-specific unwanted content from the DOM
 */
transforms.stripWiktionarySpecificMarkup = function(doc) {
    const unwantedAttrs = [ '.ib-brac', '.ib-content', '.defdate' ];
    _rmElementsWithSelectors(doc, unwantedAttrs);
};

/**
 * Nukes stuff from the DOM we don't want for pages from Parsoid.
 */
transforms.stripUnneededMarkup = function(doc, legacy) {
    _runAllSectionsTransforms(doc, legacy);
    // runLeadSectionTransforms(doc);
    _applyOptionalParsoidSpecificTransformations(doc);

    _removeUnwantedWikiContentForApp(doc, legacy);
};

/**
 * Nukes stuff from the DOM we don't want for pages from Parsoid before we parse reference lists.
 */
transforms.stripUnneededReferenceMarkup = function(doc) {
    _removeUnwantedElements(doc, [
        'span.Z3988',                      // Remove bibliographic metadata
        'span:empty',                      // Remove empty <span></span>
    ]);

    _applyOptionalParsoidSpecificTransformations(doc, true);
};

transforms.addRequiredMarkup = function(doc) {
    _addParsoidSpecificMarkup(doc);
    anchorPopUpMediaTransforms.fixVideoAnchor(doc);
};

/**
 * Nukes stuff from the DOM we don't want for the main page, which comes from mobileview.
 */
transforms.runMainPageDomTransforms = function(text) {
    const doc = domino.createDocument(text);

    _runAllSectionsTransforms(doc);
    // runLeadSectionTransforms(doc);

    return doc.body.innerHTML;
};

transforms.rmElementsWithSelector = rmElementsWithSelector;

// Make two internal functions visible for testing
transforms._rmBracketSpans = _rmBracketSpans;
transforms._rmElementsWithSelectors = _rmElementsWithSelectors;

transforms.relocateFirstParagraph = relocateFirstParagraph;
transforms.extractHatnotes = extractHatnotes;
transforms.markReferenceSections = markReferenceSections;
transforms.stripReferenceListContent = stripReferenceListContent;
transforms.extractInfobox = extractInfobox;
transforms.extractPageIssues = extractPageIssues;
transforms.extractLeadIntroduction = extractLeadIntroduction;
transforms.flattenElements = flattenElements;
transforms.summarize = summarize;
transforms.extractReferenceLists = extractReferenceLists;

module.exports = transforms;
