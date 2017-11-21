'use strict';

const api = require('./api-util');

const MIN_IMAGE_SIZE = 64;
const MAX_IMAGE_WIDTH = 1280;

const SELECTORS = [
    'figure[typeof^=mw:Image]',
    'figure[typeof^=mw:Video]',
    'figure[typeof^=mw:Audio]',
    'span[typeof^=mw:Image]',
    'span[typeof^=mw:Video]',
    'span[typeof^=mw:Audio]',
    'figure-inline[typeof^=mw:Image]',
    'figure-inline[typeof^=mw:Video]',
    'figure-inline[typeof^=mw:Audio]'
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
const Audio = new MediaType('video', 'audio');
const Unknown = new MediaType(null, 'unknown');

function getMediaType(typeofAttr) {
    switch (typeofAttr.slice(0, 8)) {
        case 'mw:Image':
            return Image;
        case 'mw:Video':
            return Video;
        case 'mw:Audio':
            return Audio;
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
        let derivatives;
        if (mediaType === Video) {
            const dataMw = JSON.parse(elem.getAttribute('data-mw'));
            if (dataMw) {
                startTime = dataMw.starttime;
                endTime = dataMw.endtime;
            }
            const sources = elem.getElementsByTagName('source');
            if (sources.length) {
                derivatives = [].map.call(sources, (source) => {
                    return {
                        src: source.getAttribute('src'),
                        type: source.getAttribute('type'),
                        title: source.getAttribute('data-title'),
                        short_title: source.getAttribute('data-shorttitle'),
                        width: source.getAttribute('data-file-width'),
                        height: source.getAttribute('data-file-height')
                    };
                });
            }
        }
        return {
            title: resourceElem && resourceElem.getAttribute('resource').replace(/^.\//, ''),
            type: mediaType.name,
            start_time: startTime,
            end_time: endTime,
            derivatives
        };
    });
}

function makeResults(items) {
    return items.map((item) => {
        const info =  item.imageinfo[0];
        return {
            title: item.title,
            url: info.url,
            thumbUrl: info.thumburl,
            mime: info.mime,
            width: info.width,
            height: info.height,
            size: info.size,
            ext: getExtMetadataValues(info.extmetadata)
        };
    });
}

function filterResult(item) {
    // Reject gallery items if they're too small.
    // Also reject SVG and PNG items by default, because they're likely to be
    // logos and/or presentational images.
    return item.url
        && (item.type === Audio.name || item.width >= MIN_IMAGE_SIZE)
        && (item.type === Audio.name || item.height >= MIN_IMAGE_SIZE)
        && !item.mime.includes('svg')
        && !item.mime.includes('png');
}

/**
 * Gets metadata about media items from MW API.
 *
 * Batches requests by sets of 50 since we may be dealing with large title sets, and 50 titles is
 * the max we can specify at a time through the query title parameter.
 *
 * https://www.mediawiki.org/wiki/API:Query#Specifying_pages
 */
function getMetadataFromApi(app, req, titles) {
    const query = {
        action: 'query',
        format: 'json',
        formatversion: 2,
        prop: 'imageinfo',
        iiprop: 'url|dimensions|mime|extmetadata',
        iiurlwidth: MAX_IMAGE_WIDTH,
        titles: titles.join('|'),
        continue: ''
    };

    return api.mwApiGetBatched(app, req.params.domain, query, titles).then((response) => {
        return { items: makeResults(response) };
    });
}

module.exports = {
    getMediaItemInfoFromPage,
    getMetadataFromApi,
    filterResult,
    SELECTORS
};
