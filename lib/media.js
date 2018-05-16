'use strict';

const domino = require('domino');
const _ = require('underscore');
const striptags = require('striptags');
const api = require('./api-util');
const mwapi = require('./mwapi');
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
 * @return {!boolean} true if the element or an ancestor is part of a blacklisted class
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
 * @param {!string} html raw Parsoid HTML
 * @return {!Array} array containing the information on the media items on the page, in order of
 *          appearance
 */
function getMediaItemInfoFromPage(html) {
    const doc = domino.createDocument(html);
    // todo: handle Mathoid-rendered math images
    const elems = doc.querySelectorAll(Selectors.join()).filter((elem) => {
        const mediaType = getMediaType(elem);
        const resource = mediaType.selector && elem.querySelector(mediaType.selector);
        return (mediaType !== Image || !isTooSmall(resource)) && !isDisallowed(elem);
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
        // eslint-disable-next-line max-len
        let title = resource && decodeURIComponent(resource.getAttribute('resource').replace(/^.\//, ''));
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
                    url: source.getAttribute('src'),
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
        } else if (mediaType === Pronunciation) {
            title = decodeURIComponent(`File:${elem.getAttribute('title')}`);
            audioType = 'pronunciation';
        } else if (mediaType === Audio) {
            audioType = elem.closest(SpokenWikipediaId) ? 'spoken' : 'generic';
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
    return _.uniq(results, elem => elem.title);
}

/**
 * Converts a metadata array to a standard JS key-value object.
 * @param {!Object[]} meta A metadata array from Commons ([ { name: foo, value: bar }, ... ])
 * @return {!Object} a consolidated object ({ foo: bar, ... })
 */
function metadataToObject(meta) {
    return Object.assign(...meta.map(item => ({ [item.name]: item.value })));
}

/**
 * Get structured artist info from extmetadata (to the extent possible).
 * We take a rather conservative approach here:
 * 1) In the 'html' property, we always return the full HTML string.
 * 2) If the field contains only plain text, we assume this is an artist name and
 *    return it in the 'name' property.
 * 3) If the HTML string is of a specific common form, we parse the user name and
 *    user page from it, and return them in the 'name' and 'user_page' fields respectively.
 *    That form is "<a href=\"//commons.wikimedia.org/wiki/User:Foo\" title=\"User:Foo\">Foo</a>".
 * @param {?string} html html string from extmetadata
 * @return {!Object} structured artist info
 */
function getStructuredArtistInfo(html) {
    const doc = domino.createDocument(html);
    if (!doc.body.textContent) {
        return;
    }
    let name;
    let userPage;
    if (doc.body.textContent === html) {
        name = doc.body.textContent;
    } else {
        const a = doc.body.querySelector('a');
        if (a && a.outerHTML === html && a.getAttribute('title') === `User:${doc.body.textContent}`
            // TODO: Update to handle all Wikimedia project domains
            && a.getAttribute('href') === `//commons.wikimedia.org/wiki/${a.title}`) {
            name = doc.body.textContent;
            userPage = `https:${a.getAttribute('href')}`;
        }
    }
    return { html, name, user_page: userPage };
}

function makeResults(items, siteinfo) {
    return items.map((item) => {
        const info =  item.imageinfo[0];
        const meta = info.metadata && metadataToObject(info.metadata);
        const ext = info.extmetadata;
        const isAudio = info.mediatype === 'AUDIO';
        const isSvg = info.mime && info.mime.includes('svg');
        const canonicalTitle = mwapi.getDbTitle(item.title, siteinfo);
        const artist = ext && ext.Artist && getStructuredArtistInfo(ext.Artist.value);
        const rawDescription = ext && ext.ImageDescription && ext.ImageDescription.value;
        return {
            titles: {
                canonical: canonicalTitle,
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
            file_page: info.descriptionurl,
            duration: meta && (meta.length || meta.playtime_seconds) || undefined,
            artist,
            credit: ext && ext.Credit && ext.Credit.value,
            license: {
                type: ext && ext.LicenseShortName && ext.LicenseShortName.value,
                code: ext && ext.License && ext.License.value,
                url: ext && ext.LicenseUrl && ext.LicenseUrl.value
            },
            description: rawDescription && {
                html: rawDescription,
                text: striptags(rawDescription)
            }
        };
    }).reduce((res, item) => Object.assign(res, { [item.titles.canonical]: item }), {});
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
        continue: ''
    };

    return api.mwApiGetBatched(app, req.params.domain, query, titles).then((response) => {
        return makeResults(response, siteinfo);
    });
}

function combineResponses(apiResponse, pageMediaList) {
    return pageMediaList.map((mediaItem) => {
        Object.assign(mediaItem, apiResponse[mediaItem.title]);
        delete mediaItem.title;

        // delete 'original' property for videos
        if (mediaItem.sources) {
            delete mediaItem.original;
        }
        return mediaItem;
    });
}

module.exports = {
    getMediaItemInfoFromPage,
    getMetadataFromApi,
    combineResponses,
    testing: {
        getStructuredArtistInfo,
        imageName: Image.name,
        videoName: Video.name,
        audioName: Audio.name,
    }
};
