'use strict';

const domino = require('domino');
const api = require('./api-util');
const Title = require('mediawiki-title').Title;

const MAX_ITEM_COUNT = 500;
const MIN_IMAGE_SIZE = 64;
const MAX_IMAGE_WIDTH = 1280;


function dbKey(str, si) {
    return Title.newFromText(str, si).getPrefixedDBKey();
}

/**
 * Sort an array of media items in place by their order of appearance in an HTML document.
 * @param {!string} html a raw HTML document
 * @param {!Array} media an array of media items as returned by gallery.collectionPromise
 * @param {!Object} si a site info object as returned by mwapi.getSiteInfo
 */
function sort(html, media, si) {
    const doc = domino.createDocument(html);
    const images = doc.querySelectorAll('img,video');
    const titles = [];
    // TODO: handle Mathoid-rendered math images
    images.forEach((img) => {
        if (img.hasAttribute('resource')) {
            titles.push(img.getAttribute('resource').replace(/^\.\//, ''));
        }
    });
    media.items.sort((a, b) => {
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

function filterTitles(items) {
    // Reject gallery items if they're too small.
    // Also reject SVG and PNG items by default, because they're likely to be
    // logos and/or presentational images.
    return items.filter((item) => {
        const imageInfo = item.imageinfo && Array.isArray(item.imageinfo) && item.imageinfo[0];
        return imageInfo
            && imageInfo.width >= MIN_IMAGE_SIZE
            && imageInfo.height >= MIN_IMAGE_SIZE
            && !imageInfo.mime.includes('svg')
            && !imageInfo.mime.includes('png');
    }).map((item) => {
        return item.title;
    });
}

/**
 * Gets the gallery content from MW API
 * TODO: ensure that all media items are correctly accounted for on very large articles
 */
function collectionPromise(app, req) {
    const query = {
        action: 'query',
        format: 'json',
        formatversion: 2,
        titles: req.params.title,
        continue: '',
        prop: 'imageinfo',
        iiprop: 'dimensions|mime',
        generator: 'images',
        gimlimit: MAX_ITEM_COUNT,
        redirects: true
    };
    return api.mwApiGet(app, req.params.domain, query).then((response) => {
        if (!response.body.query || !response.body.query.pages) {
            return { items: [] };
        }
        const query = {
            action: 'query',
            format: 'json',
            formatversion: 2,
            prop: 'videoinfo',
            viprop: 'url|dimensions|mime|extmetadata|derivatives',
            viurlwidth: MAX_IMAGE_WIDTH,
            titles: filterTitles(response.body.query.pages).join('|'),
            continue: ''
        };
        return api.mwApiGet(app, req.params.domain, query).then((response) => {
            const pages = response.body.query && response.body.query.pages;
            const items = pages ? makeResults(pages) : [];
            return { items };
        });
    });
}

module.exports = {
    sort,
    collectionPromise
};
