'use strict';

const domino = require('domino');
const underscore = require('underscore');
const api = require('./api-util');
const Title = require('mediawiki-title').Title;
const Selectors = require('./selectors').MediaSelectors;
const Blacklist = require('./selectors').MediaBlacklist;
const SpokenWikipediaId = require('./selectors').SpokenWikipediaId;

const MIN_IMAGE_SIZE = 64;
const DEFAULT_THUMB_SIZE = 320;


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
 * Returns whether the element or an ancestor is part of a blacklisted class
 * @param {!Element} elem an HTML Element
 * @return {!Boolean} true if the element or an ancestor is part of a blacklisted class
 */
function isDisallowed(elem) {
    return !!(elem.closest(Blacklist.join()));
}

/**
 * Returns whether the on-page size of an <img> element is small enough to filter from the response
 * @param {!Element} img an <img> element
 */
function isTooSmall(img) {
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    return width < MIN_IMAGE_SIZE || height < MIN_IMAGE_SIZE;
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
    const elems = doc.querySelectorAll(Selectors.join()).filter((elem) => {
        const mediaType = getMediaType(elem);
        const resource = mediaType.selector && elem.querySelector(mediaType.selector);
        return !isDisallowed(elem) && (mediaType === Image ? !isTooSmall(resource) : true);
    });
    const results = [].map.call(elems, (elem) => {
        const mediaType = getMediaType(elem);
        const resource = mediaType.selector && elem.querySelector(mediaType.selector);
        const figCaption = elem.querySelector('figcaption');
        const caption = figCaption && {
            html: figCaption.innerHTML,
            text: figCaption.textContent
        };
        const section = elem.closest('section') || undefined;
        const sectionId = section && parseInt(section.getAttribute('data-mw-section-id'), 10);
        const gallery = elem.closest('.gallery') || undefined;
        const galleryId = gallery && gallery.getAttribute('id');
        let title = resource && resource.getAttribute('resource').replace(/^.\//, '');
        let startTime;
        let endTime;
        let thumbTime;
        let audioType;
        let sources;
        if (mediaType === Video) {
            const dataMw = JSON.parse(elem.getAttribute('data-mw'));
            if (dataMw) {
                startTime = dataMw.starttime;
                endTime = dataMw.endtime;
                thumbTime = dataMw.thumbtime;
            }
            const sourceElems = elem.getElementsByTagName('source');
            sources = [].map.call(sourceElems, (source) => {
                return {
                    source: source.getAttribute('src'),
                    mime: source.getAttribute('type').split('; ')[0],
                    // eslint-disable-next-line no-useless-escape
                    codecs: source.getAttribute('type').split('; ')[1].split('\"')[1].split(', '),
                    name: source.getAttribute('data-title'),
                    short_name: source.getAttribute('data-shorttitle'),
                    // eslint-disable-next-line max-len
                    width: source.getAttribute('data-file-width') || source.getAttribute('data-width'),
                    // eslint-disable-next-line max-len
                    height: source.getAttribute('data-file-height') || source.getAttribute('data-height')
                };
            });
        } else if (mediaType === Audio) {
            if (elem.closest(SpokenWikipediaId)) {
                audioType = 'spoken';
            }
        } else if (mediaType === Pronunciation) {
            title = `File:${elem.getAttribute('title')}`;
            audioType = 'pronunciation';
        }
        return {
            title,
            section_id: sectionId,
            type: mediaType.name,
            caption,
            start_time: startTime,
            end_time: endTime,
            thumb_time: thumbTime,
            audio_type: audioType,
            gallery_id: galleryId,
            sources
        };
    });
    return underscore.uniq(results, elem => elem.title);
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
        const isAudio = info.mediatype === 'AUDIO';
        const isSvg = info.mime && info.mime.includes('svg');
        const canonical = Title.newFromText(item.title, siteinfo).getPrefixedDBKey();
        return {
            titles: {
                canonical,
                normalized: item.title,
                display: item.pageprops && item.pageprops.displaytitle || item.title
            },
            thumbnail: {
                source: info.thumburl,
                width: info.thumbwidth,
                height: info.thumbheight,
                mime: info.thumbmime
            },
            original: {
                source: info.url,
                width: isAudio || isSvg ? undefined : info.width,
                height: isAudio || isSvg ? undefined : info.height,
                mime: info.mime,
            },
            page_count: info.pagecount,
            file_page: `https://commons.wikimedia.org/wiki/${canonical}`,
            duration: meta && (meta.length || meta.playtime_seconds) || undefined,
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
    const isAudio = item.type === Audio.name;
    const isSvg = item.original && item.original.mime && item.original.mime.includes('svg');
    return item.sources || item.original && item.original.source
        && (isAudio || isSvg || item.original.width >= MIN_IMAGE_SIZE)
        && (isAudio || isSvg || item.original.height >= MIN_IMAGE_SIZE);
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
        'size',
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
        prop: 'imageinfo|pageprops',
        iiprop: props.join('|'),
        iiurlwidth: DEFAULT_THUMB_SIZE,
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
