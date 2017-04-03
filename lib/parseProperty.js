/**
 * Common DOM transformations for mobile apps.
 * We rearrange some content and remove content that is not shown/needed.
 */

'use strict';

const mUtil = require('./mobile-util');
const escape = require('escape-string-regexp');

function parseInfobox(doc) {
    const ROW_SELECTOR = 'table.infobox > tbody > tr';
    const ROW_COL_SELECTOR = 'tr > td, tr > th';

    const rows = doc.querySelectorAll(ROW_SELECTOR);
    const table = rows.map((row) => {
        const cols = row.querySelectorAll(ROW_COL_SELECTOR);
        return cols.map((column) => { return column.innerHTML.trim(); });
    });

    return mUtil.defaultVal(mUtil.filterEmpty(table));
}

function parsePronunciationFilePageUrls(doc) {
    const ipaFileWithExtensionPageUrlSelector = 'span.IPA a[href*=.]';
    return doc.querySelectorAll(ipaFileWithExtensionPageUrlSelector)
        .map((anchor) => {
            return anchor.getAttribute('href');
        });
}

function filePageUrlToFilename(url) {
    return url && url.replace(/^.*wiki\/File:/, '');
}

const minimalEncoding = (txt) => {
    return txt
    .replace(/"/g, '%22')
    .replace(/'/g, '%27')
    .replace(/\[/g, '%5B')
    .replace(/\]/g, '%5D');
};

function filePageUrlToFileUrlSelector(filePageUrl) {
    const selector = `a[href^=//][href$=${minimalEncoding(filePageUrlToFilename(filePageUrl))}]`;
    // NOTE: escape() is deprecated, but encodes certain filenames correctly, whereas the preferred
    // encodeURI() and encodeURIComponent() both fail.  One such example is
    // 'En-us-Yazidis_from_Iraq_pronunciation_(Voice_of_America).ogg'.
    // global.escape is used to pass jshint, which (incorrectly) flags 'escape' as undefined.
    const escapedSelector
        = `a[href^=//][href$=${global.escape(filePageUrlToFilename(filePageUrl))}]`;
    // TODO: reevaluate whether the dual selector is necessary
    return filePageUrl
        && `${selector}, ${escapedSelector}`;
}

function pickPronunciationFilePageUrl(urls, title) {
    if (urls.length) {
        // Filenames may contain different delimiters than the page title uses.
        // Increases chances of success for this crude heuristic by allowing
        // any delimiter. e.g., "Molecular biology" may match
        // "en-us-molecular-biology.mp3".
        const titleRegExp = new RegExp(escape(title).replace(/[\s_-]/g, '.?'), 'i');
        return urls.find((url) => {
            return titleRegExp.test(url);
        }) || urls[0];
    }
}

function parsePronunciation(doc, title) {
    const pageUrls = parsePronunciationFilePageUrls(doc);
    const pageUrl = pageUrls && pickPronunciationFilePageUrl(pageUrls, title);
    const selector = pageUrl && filePageUrlToFileUrlSelector(pageUrl);
    const fileAnchor = selector && doc.querySelector(selector);
    const url = fileAnchor && fileAnchor.getAttribute('href');
    return url && { url };
}

/**
 * @param {?string} latLngStr a string consisting of latitude and longitude. The values should be
 * separated by ; or , or space.
 * @return {?Geo} if latitude or longitude is truthy, else undefined.
 */
function latLngStrToGeo(latLngStr) {
    const latLng = latLngStr && latLngStr.split(/[;, ]+/) || [];
    const geo = latLng.length &&
        { latitude: latLng[0] && parseFloat(latLng[0]),
            longitude: latLng[1] && parseFloat(latLng[1]) };
    return mUtil.defaultVal(mUtil.filterEmpty(geo));
}

/**
 * Searches for Geo coordinates and adds them to the given page object
 */
function parseGeo(lead, page) {
    let lat;
    let lng;
    let coordinates = lead.querySelector('span#coordinates .geo');
    let geo = coordinates && latLngStrToGeo(coordinates.textContent);
    if (!geo) {
        coordinates = lead.querySelector('#geoCoord .geo');
        lat = coordinates && coordinates.querySelector('.latitude');
        lng = coordinates && coordinates.querySelector('.longitude');
        geo = lat && lng && latLngStrToGeo(`${lat.textContent};${lng.textContent}`);
    }
    if (geo) {
        page.geo = geo;
    }
}

/**
 * Searches for Spoken Wikipedia audio files and adds them to the given page object.
 * https://en.wikipedia.org/wiki/Wikipedia:WikiProject_Spoken_Wikipedia/Template_guidelines
 */
function parseSpokenWikipedia(doc, page) {
    const spokenSectionDiv = doc.querySelector('div#section_SpokenWikipedia');
    if (spokenSectionDiv) {
        const dataMW = spokenSectionDiv.getAttribute('data-mw');
        const parsedData = dataMW && JSON.parse(dataMW);
        const firstPart = parsedData && parsedData.parts[0];
        const template = firstPart && firstPart.template;
        const target = template && template.target;
        if (target && target.wt) {
            let fileName;
            if (target.wt === 'Spoken Wikipedia') {
                // single audio file: use first param (2nd param is recording date)
                fileName = `File:${template.params['1'].wt}`;
                page.spoken = {};
                page.spoken.files = [fileName];
            } else {
                const match = /Spoken Wikipedia-([2-5])/.exec(target.wt);
                if (match) {
                    // multiple audio files: skip first param (recording date)
                    page.spoken = {};
                    page.spoken.files = [];
                    const keyLength = Object.keys(template.params).length;
                    for (let key = 2; key <= keyLength; key++) {
                        fileName = `File:${template.params[key].wt}`;
                        page.spoken.files.push(fileName);
                    }
                }
            }
        }
    }
}

module.exports = {
    parseInfobox,
    parsePronunciation,
    parseSpokenWikipedia,
    parseGeo,
    testing: {
        pickPronunciationFilePageUrl,
        filePageUrlToFileUrlSelector
    }
};
