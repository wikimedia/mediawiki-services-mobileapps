'use strict';

const api = require('./api-util');

const MIN_IMAGE_SIZE = 64;
const MAX_IMAGE_WIDTH = 1280;

const SELECTORS = [
    'figure[typeof^=mw:Image]',
    'figure[typeof^=mw:Video]',
    'span[typeof^=mw:Image]',
    'span[typeof^=mw:Video]',
    'figure-inline[typeof^=mw:Image]',
    'figure-inline[typeof^=mw:Video]'
];

/**
 * A MediaWiki media type as represented in Parsoid HTML.
 * @param {!String} resourceSelector the selector for the child element containing the core resource
 * @param {!String} name the image type as referred to internally and in the endpoint response
 */
class MediaType {
    constructor(resourceSelector, name) {
        this.resourceSelector = resourceSelector;
        this.name = name;
    }
}

const Image = new MediaType('img', 'image');
const Video = new MediaType('video', 'video');
const Unknown = new MediaType(null, 'unknown');

function getMediaType(typeofAttr) {
    switch (typeofAttr.slice(0, 8)) {
        case 'mw:Image':
            return Image;
        case 'mw:Video':
            return Video;
        default:
            return Unknown;
    }
}

function getExtMetadataValues(extmetadata) {
    const ext = {};
    Object.keys(extmetadata).forEach((key) => {
        ext[key] = extmetadata[key].value;
    });
    return ext;
}

/**
 * Get file page titles from a NodeList of media elements from Parsoid HTML
 * @param {!NodeList} selection NodeList containing media items from Parsoid HTML
 * @return {!Array} array containing the information on the media items on the page, in order of
 *          appearance
 */
function getMediaItemInfoFromPage(selection) {
    return [].map.call(selection, (elem) => {
        const mediaType = getMediaType(elem.getAttribute('typeof'));
        const resourceElem = elem.querySelector(mediaType.resourceSelector);
        let startTime;
        let endTime;
        if (mediaType === Video) {
            const dataMw = JSON.parse(elem.getAttribute('data-mw'));
            if (dataMw) {
                startTime = dataMw.starttime;
                endTime = dataMw.endtime;
            }
        }
        return {
            title: resourceElem && resourceElem.getAttribute('resource').replace(/^.\//, ''),
            type: mediaType.name,
            start_time: startTime,
            end_time: endTime
        };
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
function getMetadataFromApi(app, req, titles) {
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
    getMediaItemInfoFromPage,
    getMetadataFromApi,
    filterResult,
    SELECTORS
};
