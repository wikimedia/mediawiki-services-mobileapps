'use strict';

const domino = require('domino');
const api = require('./api-util');
const mUtil = require('./mobile-util');
const Title = require('mediawiki-title').Title;
const MediaSelectors = require('./selectors').MediaSelectors;
const SpokenWikipediaId = require('./selectors').SpokenWikipediaId;

const MIN_IMAGE_SIZE = 64;
const MAX_IMAGE_WIDTH = 1280;


/**
 * A MediaWiki media type as represented in Parsoid HTML.
 * @param {!String} resourceSelector the selector for the child element containing the core resource
 * @param {!String} name the image type as referred to internally and in the endpoint response
 */
class MediaType {
    constructor(selector, name) {
        this.selector = selector;
        this.name = name;
    }
}

const Image = new MediaType('img', 'image');
const Video = new MediaType('video', 'video');
const Audio = new MediaType('video', 'audio');
const Pronunciation = new MediaType(null, Audio.name);
const Unknown = new MediaType(null, 'unknown');

function getMediaType(elem) {
    if (elem.getAttribute('typeof')) {
        switch (elem.getAttribute('typeof').slice(0, 8)) {
            case 'mw:Image':
                return Image;
            case 'mw:Video':
                return Video;
            case 'mw:Audio':
                return Audio;
            default:
                return Unknown;
        }
    } else if (elem.getAttribute('rel') === 'mw:MediaLink') {
        return Pronunciation;
    }
}

/**
 * Get file page titles from a NodeList of media elements from Parsoid HTML
 * @param {!String} html raw Parsoid HTML
 * @return {!Array} array containing the information on the media items on the page, in order of
 *          appearance
 */
function getMediaItemInfoFromPage(html) {
    const doc = domino.createDocument(html);
    // todo: handle Mathoid-rendered math images
    const selection = doc.querySelectorAll(MediaSelectors.join());
    return [].map.call(selection, (elem) => {
        const mediaType = getMediaType(elem);
        const resource = mediaType.selector && elem.querySelector(mediaType.selector);
        const figCaption = elem.querySelector('figcaption');
        const captionHtml = figCaption && figCaption.innerHTML;
        const captionText = figCaption && figCaption.textContent;
        let title = resource && resource.getAttribute('resource').replace(/^.\//, '');
        let startTime;
        let endTime;
        let thumbTime;
        let audioType;
        let derivatives;
        if (mediaType === Video) {
            const dataMw = JSON.parse(elem.getAttribute('data-mw'));
            if (dataMw) {
                startTime = dataMw.starttime;
                endTime = dataMw.endtime;
                thumbTime = dataMw.thumbtime;
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
        } else if (mediaType === Audio) {
            let parent = elem.parentNode;
            while (parent) {
                if (mUtil.isElement(parent) && parent.id === SpokenWikipediaId) {
                    audioType = 'spoken';
                }
                parent = parent.parentNode;
            }
        } else if (mediaType === Pronunciation) {
            title = `File:${elem.getAttribute('title')}`;
            audioType = 'pronunciation';
        }
        return {
            title,
            type: mediaType.name,
            caption_html: captionHtml,
            caption_text: captionText,
            start_time: startTime,
            end_time: endTime,
            thumb_time: thumbTime,
            audio_type: audioType,
            derivatives
        };
    });
}

/**
 * Converts a metadata array to a standard JS key-value object.
 * @param {!Object[]} meta A metadata array from Commons ([ { name: foo, value: bar }, ... ])
 * @return {!Object} a consolidated object ({ foo: bar, ... })
 */
function metadataToObject(meta) {
    return Object.assign(...meta.map(item => ({ [item.name]: item.value })));
}

function makeResults(items, siteinfo) {
    return items.map((item) => {
        const info =  item.imageinfo[0];
        const meta = info.metadata && metadataToObject(info.metadata);
        const ext = info.extmetadata;
        return {
            title: Title.newFromText(item.title, siteinfo).getPrefixedDBKey(),
            thumb: {
                source: info.thumburl,
                width: info.thumbwidth,
                height: info.thumbheight,
                mime: info.thumbmime
            },
            original: {
                source: info.url,
                width: info.mediatype === 'AUDIO' ? undefined : info.width,
                height: info.mediatype === 'AUDIO' ? undefined : info.height,
                mime: info.mime,
                size: info.size
            },
            duration: meta && (meta.length || meta.playtime_seconds) || undefined,
            derivatives: info.derivatives,
            artist: ext && ext.Artist && ext.Artist.value,
            credit: ext && ext.Credit && ext.Credit.value,
            license: ext && ext.LicenseShortName && ext.LicenseShortName.value,
            license_url: ext && ext.LicenseUrl && ext.LicenseUrl.value,
            description: ext && ext.ImageDescription && ext.ImageDescription.value
        };
    });
}

function filterResult(item) {
    // Reject gallery items if they're too small.
    // Also reject SVG and PNG items by default, because they're likely to be
    // logos and/or presentational images.
    return item.original && item.original.source
        && (item.type === Audio.name || item.original.width >= MIN_IMAGE_SIZE)
        && (item.type === Audio.name || item.original.height >= MIN_IMAGE_SIZE)
        && !item.original.mime.includes('svg')
        && !item.original.mime.includes('png');
}

/**
 * Gets metadata about media items from MW API.
 *
 * Batches requests by sets of 50 since we may be dealing with large title sets, and 50 titles is
 * the max we can specify at a time through the query title parameter.
 *
 * https://www.mediawiki.org/wiki/API:Query#Specifying_pages
 */
function getMetadataFromApi(app, req, titles, siteinfo) {
    const props = [
        'canonicaltitle',
        'url',
        'dimensions',
        'mime',
        'thumbmime',
        'mediatype',
        'metadata',
        'commonmetadata',
        'extmetadata'
    ];

    const query = {
        action: 'query',
        format: 'json',
        formatversion: 2,
        prop: 'imageinfo',
        iiprop: props.join('|'),
        iiurlwidth: MAX_IMAGE_WIDTH,
        iimetadataversion: 'latest',
        titles: titles.join('|'),
        continue: ''
    };

    return api.mwApiGetBatched(app, req.params.domain, query, titles).then((response) => {
        return { items: makeResults(response, siteinfo) };
    });
}

module.exports = {
    getMediaItemInfoFromPage,
    getMetadataFromApi,
    filterResult,
    Image,
    Video,
    Audio
};
