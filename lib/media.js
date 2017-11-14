'use strict';

const domino = require('domino');
const api = require('./api-util');
const Title = require('mediawiki-title').Title;

const MIN_IMAGE_SIZE = 64;
const MAX_IMAGE_WIDTH = 1280;


function dbKey(str, si) {
    return Title.newFromText(str, si).getPrefixedDBKey();
}

/**
 * Sort an array of media items in place by their order of appearance in an HTML document.
 * @param {!Array} titles a list of File page titles for media items
 * @param {!Array} items an array of media metadata items as returned by getMetadata
 * @param {!Object} si a site info object as returned by mwapi.getSiteInfo
 */
function sort(titles, items, si) {
    items.sort((a, b) => {
        return titles.indexOf(dbKey(a.title, si)) - titles.indexOf(dbKey(b.title, si));
    });
}

function getExtMetadataValues(extmetadata) {
    const ext = {};
    Object.keys(extmetadata).forEach((key) => {
        ext[key] = extmetadata[key].value;
    });
    return ext;
}

/**
 * Get media item titles from a Parsoid HTML document.
 * @param {!String} html page html
 * @return {!Array} an array of titles of File pages for the media items on the page
 */
function getTitles(html) {
    const doc = domino.createDocument(html);
    // todo: handle Mathoid-rendered math images
    const selection = doc.querySelectorAll('*[typeof^=mw:Image] img,*[typeof^=mw:Video] video');
    return [].map.call(selection, (elem) => {
        return elem.getAttribute('resource').replace(/^.\//, '');
    });
}

function makeResults(items) {
    return items.map((item) => {
        const info =  item.videoinfo[0];
        return {
            title: item.title,
            url: info.url,
            thumbUrl: info.thumburl,
            mime: info.mime,
            width: info.width,
            height: info.height,
            size: info.size,
            derivatives: info.derivatives,
            ext: getExtMetadataValues(info.extmetadata)
        };
    });
}

function filterResult(item) {
    // Reject gallery items if they're too small.
    // Also reject SVG and PNG items by default, because they're likely to be
    // logos and/or presentational images.
    return item.url
        && item.width >= MIN_IMAGE_SIZE
        && item.height >= MIN_IMAGE_SIZE
        && !item.mime.includes('svg')
        && !item.mime.includes('png');
}

/**
 * Gets the gallery content from MW API
 * TODO: ensure that all media items are correctly accounted for on very large articles
 */
function getMetadata(app, req, titles) {
    const query = {
        action: 'query',
        format: 'json',
        formatversion: 2,
        prop: 'videoinfo',
        viprop: 'url|dimensions|mime|extmetadata|derivatives',
        viurlwidth: MAX_IMAGE_WIDTH,
        titles: titles.join('|'),
        continue: ''
    };
    return api.mwApiGet(app, req.params.domain, query).then((response) => {
        const pages = response.body.query && response.body.query.pages;
        const items = pages ? makeResults(pages) : [];
        return { items };
    });
}

module.exports = {
    sort,
    getTitles,
    getMetadata,
    filterResult
};
