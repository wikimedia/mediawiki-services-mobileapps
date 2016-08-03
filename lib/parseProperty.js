/**
 * Common DOM transformations for mobile apps.
 * We rearrange some content and remove content that is not shown/needed.
 */

'use strict';

var mUtil = require('../lib/mobile-util');
var util = require('util');
var escape = require('escape-string-regexp');

function parseInfobox(doc) {
    var ROW_SELECTOR = 'table.infobox > tbody > tr';
    var ROW_COL_SELECTOR = 'tr > td, tr > th';

    var rows = doc.querySelectorAll(ROW_SELECTOR);
    var table = rows.map(function (row) {
        var cols = row.querySelectorAll(ROW_COL_SELECTOR);
        return cols.map(function(column) { return column.innerHTML.trim(); });
    });

    return mUtil.defaultVal(mUtil.filterEmpty(table));
}

function parsePronunciationFilePageUrls(doc) {
    var ipaFileWithExtensionPageUrlSelector = 'span.IPA a[href*=.]';
    return doc.querySelectorAll(ipaFileWithExtensionPageUrlSelector)
        .map(function(anchor) {
            return anchor.getAttribute('href');
        });
}

function filePageUrlToFilename(url) {
    return url && url.replace(/^.*wiki\/File:/, '');
}

function filePageUrlToFileUrlSelector(filePageUrl) {
    // NOTE: escape() is deprecated, but encodes certain filenames correctly, whereas the preferred
    // encodeURI() and encodeURIComponent() both fail.  One such example is
    // 'En-us-Yazidis_from_Iraq_pronunciation_(Voice_of_America).ogg'.
    // global.escape is used to pass jshint, which (incorrectly) flags 'escape' as undefined.
    return filePageUrl && 'a[href^=//][href$=' + global.escape(filePageUrlToFilename(filePageUrl)) + ']';
}

function pickPronunciationFilePageUrl(urls, title) {
    if (urls.length) {
        // Filenames may contain different delimiters than the page title uses.
        // Increases chances of success for this crude heuristic by allowing
        // any delimiter. e.g., "Molecular biology" may match
        // "en-us-molecular-biology.mp3".
        var titleRegExp = new RegExp(escape(title).replace(/[\s_-]/g, '.?'), 'i');
        return urls.find(function(url) {
            return titleRegExp.test(url);
        }) || urls[0];
    }
}

function parsePronunciation(doc, title) {
    var pageUrls = parsePronunciationFilePageUrls(doc);
    var pageUrl = pageUrls && pickPronunciationFilePageUrl(pageUrls, title);
    var selector = pageUrl && filePageUrlToFileUrlSelector(pageUrl);
    var fileAnchor = selector && doc.querySelector(selector);
    var url = fileAnchor && fileAnchor.getAttribute('href');
    return url && { url: url };
}

/**
 * @returns {Geo} if latitude or longitude is truthy, else undefined.
 */
function latLngStrToGeo(latLngStr) {
    var latLng = latLngStr && latLngStr.split(/[;, ]+/) || [];
    var geo = latLng.length &&
              { latitude: latLng[0] && parseFloat(latLng[0]),
                longitude: latLng[1] && parseFloat(latLng[1]) };
    return mUtil.defaultVal(mUtil.filterEmpty(geo));
}

/**
 * Searches for Geo coordinates and adds them to the given page object
 */
function parseGeo(lead, page) {
    var coordinates = lead.querySelector('span#coordinates .geo');
    var geo = coordinates && latLngStrToGeo(coordinates.textContent);
    if (geo) {
        page.geo = geo;
    }
}

/**
 * Searches for Spoken Wikipedia audio files and adds them to the given page object.
 * https://en.wikipedia.org/wiki/Wikipedia:WikiProject_Spoken_Wikipedia/Template_guidelines
 */
function parseSpokenWikipedia(doc, page) {
    var dataMW, parsedData, firstPart, template, target, match, key, fileName, keyLength,
        spokenSectionDiv = doc.querySelector('div#section_SpokenWikipedia');

    if (spokenSectionDiv) {
        dataMW = spokenSectionDiv.getAttribute('data-mw');
        parsedData = dataMW && JSON.parse(dataMW);
        firstPart = parsedData && parsedData.parts[0];
        template = firstPart && firstPart.template;
        target = template && template.target;
        if (target && target.wt) {
            if (target.wt === 'Spoken Wikipedia') {
                // single audio file: use first param (2nd param is recording date)
                fileName = 'File:' + template.params['1'].wt;
                page.spoken = {};
                page.spoken.files = [fileName];
            } else {
                match = /Spoken Wikipedia-([2-5])/.exec(target.wt);
                if (match) {
                    // multiple audio files: skip first param (recording date)
                    page.spoken = {};
                    page.spoken.files = [];
                    keyLength = Object.keys(template.params).length;
                    for (key = 2; key <= keyLength; key++) {
                        fileName = 'File:' + template.params[key].wt;
                        page.spoken.files.push(fileName);
                    }
                }
            }
        }
    }
}

module.exports = {
    parseInfobox: parseInfobox,
    parsePronunciation: parsePronunciation,
    parseSpokenWikipedia: parseSpokenWikipedia,
    parseGeo: parseGeo,
    _pickPronunciationFilePageUrl: pickPronunciationFilePageUrl
};
