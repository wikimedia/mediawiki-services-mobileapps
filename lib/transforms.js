/**
 * Common DOM transformations for mobile apps.
 * We rearrange some content and remove content that is not shown/needed.
 */

'use strict';

const domino = require('domino');
const anchorPopUpMediaTransforms = require('./transformations/anchorPopUpMediaTransforms');
const hideRedLinks = require('./transformations/hideRedLinks');
const hideIPA = require('./transformations/hideIPA');
const extractHatnotes = require('./transformations/extractHatnotes');
const markReferenceSections = require('./transformations/markReferenceSections');
const relocateFirstParagraph = require('./transformations/relocateFirstParagraph');
const extractInfobox = require( './transformations/extractInfobox' );
const extractPageIssues = require( './transformations/extractPageIssues' );
const extractLeadIntroduction = require( './transformations/extractLeadIntroduction' );

const transforms = {};

const NodeType =
{
    ELEMENT                :  1,
    //ATTRIBUTE              :  2,
    TEXT                   :  3,
    //CDATA_SECTION          :  4,
    //ENTITY_REFERENCE       :  5,
    //ENTITY                 :  6,
    //PROCESSING_INSTRUCTION :  7,
    COMMENT                :  8,
    //DOCUMENT               :  9,
    //DOCUMENT_TYPE          : 10,
    //DOCUMENT_FRAGMENT      : 11,
    //NOTATION               : 12
};

function _rmComments(node) {
    for (let n = 0; n < node.childNodes.length; n++) {
        const child = node.childNodes[n];
        if (child.nodeType === NodeType.COMMENT) {
            node.removeChild(child);
            n--;
        } else if (child.nodeType === NodeType.ELEMENT) {
            _rmComments(child);
        }
    }
}

function _rmElementsWithSelectors(doc, selectors) {
    for  (let i = 0, n = selectors.length; i < n; i++) {
        const elems = doc.querySelectorAll(selectors[i]);
        for (let j = 0, m = elems.length; j < m; j++) {
            const elem = elems[j];
            elem.parentNode.removeChild(elem);
        }
    }
}

/**
 * Replaces something like "<span>[</span>1<span>]</span>" with "[1]".
 * This is one way to reduce the payload sent to the client.
 *
 * @param doc the DOM document to be transformed
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

function _rmAttributes(doc, selector, attributeArray) {
    const ps = doc.querySelectorAll(selector) || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const node = ps[idx];
        for (let aa = 0; aa < attributeArray.length; aa++) {
            node.removeAttribute(attributeArray[aa]);
        }
    }
}

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
    _addClassTo(doc, 'figure > a, span[typeof^=mw:Image] > a', 'image');
}

function _applyOptionalParsoidSpecificTransformations(doc) {
    _rmAttributes(doc, 'a:not([rel=nofollow])', ['rel']); // only leave rel attributes with value nofollow
    _rmAttributes(doc, 'a', ['about', 'data-mw', 'id', 'typeof']);
    _rmAttributes(doc, 'div', ['about', 'data-mw', 'id', 'typeof']);
    _rmAttributes(doc, 'ol', ['about', 'data-mw', 'id', 'typeof']);
    _rmAttributes(doc, 'p', ['about', 'data-mw', 'id', 'typeof']);
    _rmAttributes(doc, 'ul', ['about', 'data-mw', 'id', 'typeof']);
    _rmAttributes(doc, 'table', ['about', 'data-mw', 'id', 'typeof']);
    _rmAttributes(doc, 'blockquote', ['about', 'data-mw', 'id', 'typeof']);
    _rmAttributes(doc, 'cite', ['about', 'data-mw', 'id', 'typeof']);
    _rmAttributes(doc, 'abbr', ['title']);
    _rmAttributes(doc, 'figure', ['id', 'typeof']);
    _rmAttributes(doc, 'b', ['id']);
    _rmAttributes(doc, 'q', ['id']);
    _rmAttributes(doc, 'td', ['id']);
    _rmAttributes(doc, 'figcaption', ['id']);
    _rmAttributes(doc, 'figcaption a[class~=image]', ['class']); // T123527
    _rmAttributes(doc, 'i', ['about', 'data-mw', 'id', 'typeof']);
    _rmAttributes(doc, 'li', ['about']);
    _rmAttributes(doc, 'img', ['alt', 'data-file-height', 'data-file-width', 'id', 'resource']);
    _rmAttributes(doc, 'span', ['about', 'data-file-type', 'data-mw', 'id', 'itemscope', 'itemtype', 'lang', 'rel',
        'title', 'typeof']);
}

/**
 * Nukes stuff from the DOM we don't want.
 */
function _runAllSectionsTransforms(doc) {
    const rmSelectors = [
        'span.Z3988',                               // Remove <span class=\"Z3988\"></span>
        'span:empty',                               // Remove empty <span></span>
        'link',
        'table.navbox',
        '.geo-nondefault',
        '.geo-multi-punct',
        '.hide-when-compact',
        'div.infobox',
        'div.magnify',
        'span#coordinates'

        // Would also like to use this but does not have any effect; https://github.com/fgnass/domino/issues/59
        //'span[style~="display:none"]',             // Remove <span style=\"display:none;\">&nbsp;</span>
    ];

    _removeUnwantedElements(doc, rmSelectors);

    // Remove reference link backs since we don't want them to appear in the reference dialog; they are not needed.
    _removeRefLinkbacks(doc);
}

/**
 * Destructive, non-Parsoid-specific transforms previously performed in the app.
 */
function _removeUnwantedWikiContentForApp(doc) {
    hideRedLinks.hideRedLinks(doc);
    hideIPA.hideIPA(doc);
}

///**
// * Nukes stuff from the lead section we don't want.
// */
//function runLeadSectionTransforms(doc) {
//    // TODO: once Parsoid produces <section> tags this should be easier.
//
//    //var rmElementsWithSelectors = [
//    //    'div.hatnote'
//    //];
//    //removeUnwantedElements(doc, rmElementsWithSelectors);
//}

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
transforms.stripUnneededMarkup = function(doc) {
    _runAllSectionsTransforms(doc);
    //runLeadSectionTransforms(doc);
    _applyOptionalParsoidSpecificTransformations(doc);

    _removeUnwantedWikiContentForApp(doc);
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
    //runLeadSectionTransforms(doc);

    return doc.body.innerHTML;
};

transforms.rmElementsWithSelector = function(doc, selector) {
    const ps = doc.querySelectorAll(selector) || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const node = ps[idx];
        node.parentNode.removeChild(node);
    }
};

// Make two internal functions visible for testing
transforms._rmBracketSpans = _rmBracketSpans;
transforms._rmElementsWithSelectors = _rmElementsWithSelectors;

transforms.relocateFirstParagraph = relocateFirstParagraph;
transforms.extractHatnotes = extractHatnotes;
transforms.markReferenceSections = markReferenceSections;
transforms.extractInfobox = extractInfobox;
transforms.extractPageIssues = extractPageIssues;
transforms.extractLeadIntroduction = extractLeadIntroduction;

module.exports = transforms;
