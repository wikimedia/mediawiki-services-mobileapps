/**
 * Common DOM transformations for mobile apps.
 * We rearrange some content and remove content that is not shown/needed.
 */

'use strict';

var mUtil = require('../lib/mobile-util');
var util = require('util');

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
    return filePageUrl && 'a[href^=//][href$=/' + filePageUrlToFilename(filePageUrl) + ']';
}

function pickPronunciationFilePageUrl(urls, title) {
    if (urls.length) {
        // Filenames may contain different delimiters than the page title uses.
        // Increases chances of success for this crude heuristic by allowing
        // any delimiter. e.g., "Molecular biology" may match
        // "en-us-molecular-biology.mp3".
        var titleRegExp = new RegExp(title.replace(/[\s_-]/g, '.?'), 'i');
        return urls.find(function(url) {
            return titleRegExp.test(url);
        }) || urls[0];
    }
}

function parsePronunciation(doc, title) {
    var pageUrls = parsePronunciationFilePageUrls(doc);
    var pageUrl = pickPronunciationFilePageUrl(pageUrls, title);
    var selector = filePageUrlToFileUrlSelector(pageUrl);
    var url = pageUrl && doc.querySelector(selector).getAttribute('href');
    return url && { url: url };
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
 * Searches for Geo coordinates and adds them to the given page object
 */
function parseGeo(lead, page) {
    var coordinates = lead.querySelector('span#coordinates .geo');
    page.geo = coordinates && latLngStrToGeo(coordinates.innerHTML);
}

/**
 * Searches for Spoken Wikipedia audio files and adds them to the given page object.
 * https://en.wikipedia.org/wiki/Wikipedia:WikiProject_Spoken_Wikipedia/Template_guidelines
 */
function parseSpokenWikipedia(doc, page) {
    var dataMW, template, target, match, maxKey, key, fileName,
        spokenSectionDiv = doc.querySelector('div#section_SpokenWikipedia');

    if (spokenSectionDiv) {
        dataMW = spokenSectionDiv.getAttribute('data-mw');
        template = JSON.parse(dataMW).parts[0].template;
        target = template.target;
        if (target && target.wt) {
            if (target.wt === 'Spoken Wikipedia') {
                // single audio file: use first param (2nd param is recording date)
                fileName = 'File:' + template.params['1'].wt;
                page.spoken = {};
                page.spoken.files = [fileName];
            } else {
                match = /Spoken Wikipedia-([2-5])/.exec(target.wt);
                if (match) {
                    maxKey = 2 + parseInt(match[1]);
                    // multiple audio files: skip first param (recording date)
                    page.spoken = {};
                    page.spoken.files = [];
                    for (key = 2; key < maxKey; key++) {
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
