/**
 * Common DOM transformations for mobile apps.
 * We rearrange some content and remove content that is not shown/needed.
 */

'use strict';

var domino = require('domino');
var util = require('util');
var anchorPopUpMediaTransforms = require('./transformations/anchorPopUpMediaTransforms');
var hideRedLinks = require('./transformations/hideRedLinks');
var hideIPA = require('./transformations/hideIPA');
var setMathFormulaImageMaxWidth = require('./transformations/setMathFormulaImageMaxWidth');

var transforms = {};

var NodeType =
{
    ELEMENT                :  1,
    //ATTRIBUTE              :  2,
    TEXT                   :  3,
    //,
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
    for (var n = 0; n < node.childNodes.length; n++) {
        var child = node.childNodes[n];
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
        let elems = doc.querySelectorAll(selectors[i]);
        for (let j = 0, m = elems.length; j < m; j++) {
            let elem = elems[j];
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
    var ps = doc.querySelectorAll('span:not([class],[style],[id])') || [];
    for (var idx = 0; idx < ps.length; idx++) {
        var node = ps[idx];
        if (/^\[|]$/.test(node.innerHTML)) {
            var bracket = doc.createTextNode(node.innerHTML);
            node.parentNode.replaceChild(bracket, node);
        }
    }
}

function _rmAttributes(doc, selector, attributeArray) {
    var ps = doc.querySelectorAll(selector) || [];
    for (var idx = 0; idx < ps.length; idx++) {
        var node = ps[idx];
        for (var aa = 0; aa < attributeArray.length; aa++) {
            node.removeAttribute(attributeArray[aa]);
        }
    }
}

function _rewriteUrlAttribute(doc, selector, attribute) {
    var ps = doc.querySelectorAll(selector) || [],
        value;
    for (var idx = 0; idx < ps.length; idx++) {
        var node = ps[idx];
        value = node.getAttribute(attribute);
        if (value) {
            value = value.replace(/^\.\//, '/wiki/');
            node.setAttribute(attribute, value);
        }
    }
}

function _addClassTo(doc, selector, className) {
    var ps = doc.querySelectorAll(selector) || [];
    for (var idx = 0; idx < ps.length; idx++) {
        var node = ps[idx];
        node.classList.add(className);
    }
}

/**
 * Removes reference link backs.
 * Example: <a href=\"#cite_ref-1\"><span class=\"mw-linkback-text\">↑ </span></a>
 */
function _removeRefLinkbacks(doc, selector, className) {
    var ps = doc.querySelectorAll('span.mw-linkback-text') || [];
    for (var idx = 0; idx < ps.length; idx++) {
        var node = ps[idx];
        var parent = node.parentNode;
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
    _rmAttributes(doc, 'a', ['about', 'data-mw', 'id', 'typeof', 'title']);
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
    _rmAttributes(doc, 'img', ['alt', 'data-file-height', 'data-file-type', 'data-file-width', 'id', 'resource']);
    _rmAttributes(doc, 'span', ['about', 'data-file-type', 'data-mw', 'id', 'itemscope', 'itemtype', 'lang', 'rel',
        'title', 'typeof']);
}

/**
 * Nukes stuff from the DOM we don't want.
 */
function _runAllSectionsTransforms(doc) {
    var rmSelectors = [
        'span.Z3988',                               // Remove <span class=\"Z3988\"></span>
        'span:empty',                               // Remove empty <span></span>
        'link',
        'sup.noprint',
        'div.noprint',
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
    var unwantedAttrs = [ '.ib-brac', '.ib-content', '.defdate' ];
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
    setMathFormulaImageMaxWidth.setMathFormulaImageMaxWidth(doc);
    anchorPopUpMediaTransforms.fixVideoAnchor(doc);
};

/**
 * Nukes stuff from the DOM we don't want for the main page, which comes from mobileview.
 */
transforms.runMainPageDomTransforms = function(text) {
    var doc = domino.createDocument(text);

    _runAllSectionsTransforms(doc);
    //runLeadSectionTransforms(doc);

    return doc.body.innerHTML;
};

transforms.rmElementsWithSelector = function(doc, selector) {
    var removals = 0,
        ps = doc.querySelectorAll(selector) || [];
    for (var idx = 0; idx < ps.length; idx++) {
        var node = ps[idx];
        node.parentNode.removeChild(node);
        removals++;
    }
};

// Strip span tags, leaving their inner HTML in place.
transforms.inlineSpanText = function(doc) {
    var ps = doc.querySelectorAll('span') || [];
    for (var idx = 0; idx < ps.length; idx++) {
        var node = ps[idx];
        var text = doc.createTextNode(node.innerHTML);
        node.parentNode.replaceChild(text, node);
    }
};

// Make two internal functions visible for testing
transforms._rmBracketSpans = _rmBracketSpans;
transforms._rmElementsWithSelectors = _rmElementsWithSelectors;

module.exports = transforms;
