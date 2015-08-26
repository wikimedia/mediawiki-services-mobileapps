/**
 * Common DOM transformations for mobile apps.
 * We rearrange some content and remove content that is not shown/needed.
 */

'use strict';

var domino = require('domino');
var mUtil = require('../lib/mobile-util');

function rmSelectorAll(doc, selector) {
    var ps = doc.querySelectorAll(selector) || [];
    for (var idx = 0; idx < ps.length; idx++) {
        var node = ps[idx];
        node.parentNode.removeChild(node);
    }
}

/**
 * Replaces something like "<span>[</span>1<span>]</span>" with "[1]".
 * This is one way to reduce the payload sent to the client.
 *
 * @param doc the DOM document to be transformed
 */
function rmBracketSpans(doc) {
    var ps = doc.querySelectorAll('span:not([class],[style],[id])') || [];
    for (var idx = 0; idx < ps.length; idx++) {
        var node = ps[idx];
        if (/^\[|]$/.test(node.innerHTML)) {
            var bracket = doc.createTextNode(node.innerHTML);
            node.parentNode.replaceChild(bracket, node);
        }
    }
}

function rmAttributeAll(doc, selector, attribute) {
    var ps = doc.querySelectorAll(selector) || [];
    for (var idx = 0; idx < ps.length; idx++) {
        var node = ps[idx];
        node.removeAttribute(attribute);
    }
}

function parseInfobox(doc) {
    var ROW_SELECTOR = 'table.infobox > tbody > tr';
    var ROW_COL_SELECTOR = 'tr > td, tr > th';

    var rows = doc.querySelectorAll(ROW_SELECTOR);
    var table = rows.map(function (row) {
        var cols = row.querySelectorAll(ROW_COL_SELECTOR);
        return cols.map(function(column) { return column.innerHTML; });
    });

    return mUtil.defaultVal(mUtil.filterEmpty(table));
}

function parsePronunciation(doc) {
    var anchor = doc.querySelector('span.IPA a[href]');
    return anchor && { 'url': anchor.href };
}

/**
 * @returns {Geo} if latitude or longitude is truthy, else undefined.
*/
function latLngStrToGeo(latLngStr) {
    var latLng = latLngStr && latLngStr.split('; ') || [];
    return latLng.length
        && { "latitude": latLng[0] && parseFloat(latLng[0]),
             "longitude": latLng[1] && parseFloat(latLng[1]) };
}

/**
 * @returns {Geo} if latitude or longitude is found, else undefined.
*/
function parseGeo(lead) {
    var coordinates = lead.querySelector('span#coordinates .geo');
    return coordinates && latLngStrToGeo(coordinates.innerHTML);
}

function moveFirstParagraphUpInLeadSection(text) {
    var doc = domino.createDocument(text);
    // TODO: mhurd: feel free to add your lead section magic here
    return doc.body.innerHTML;
}

/**
 * Nukes stuff from the DOM we don't want.
 */
function runDomTransforms(text, sectionIndex) {
    var doc = domino.createDocument(text);

    var rmSelectors = [
        'div.noprint',
        'div.infobox',
        'div.metadata',
        'table.navbox',
        'div.magnify',
        'span[style*="display:none"]',             // Remove <span style=\"display:none;\">&nbsp;</span>
        'span.Z3988'                               // Remove <span class=\"Z3988\"></span>
    ];
    if (sectionIndex === 0) {
        rmSelectors.push('div.hatnote');
    }
    rmSelectorAll(doc, rmSelectors.join(', '));    // Do single call to rmSelectorAll.

    rmAttributeAll(doc, 'a', 'rel');
    rmAttributeAll(doc, 'a,span', 'title');
    rmAttributeAll(doc, 'img', 'alt');

    rmBracketSpans(doc);

    // TODO: mhurd: add more references to functions where you do more transforms here

    return doc.body.innerHTML;
}

module.exports = {
    runDomTransforms: runDomTransforms,
    moveFirstParagraphUpInLeadSection: moveFirstParagraphUpInLeadSection,
    parseInfobox: parseInfobox,
    parsePronunciation: parsePronunciation,
    parseGeo: parseGeo,

    // visible for testing only:
    _rmBracketSpans: rmBracketSpans
};
