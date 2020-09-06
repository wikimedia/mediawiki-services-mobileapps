'use strict';

const domino = require('domino');
const _ = require('underscore');
const SpokenWikipediaId = require('./selectors').SpokenWikipediaId;
const mwapi = require('./mwapi');
const api = require('./api-util');
const NodeType = require('./nodeType');
const thumbnail = require('./thumbnail');
const leadingDotSlashRegex = /^.\//;
const globalSpaceRegex = / /g;

const MATHOID_IMG_CLASS = require('./selectors').MATHOID_IMG_CLASS;

/**
 * A MediaWiki media type as represented in Parsoid HTML.
 *
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
// TODO: change to audio only after Parsoid change https://gerrit.wikimedia.org/r/c/mediawiki/services/parsoid/+/449903 is deployed
const Audio = new MediaType('audio, video', 'audio');
// const Audio = new MediaType('video', 'audio');
const Pronunciation = new MediaType(null, Audio.name);
const MathImage = new MediaType(null, Image.name);
const TimelineImage = new MediaType(null, Image.name);
const Unknown = new MediaType(null, 'unknown');

function isMathoidImage(elem) {
    return elem.className.includes(MATHOID_IMG_CLASS);
}

function getMediaType(elem) {
    const typeOf = elem.getAttribute('typeof');
    if (typeOf) {
        switch (typeOf.slice(0, 8)) {
            case 'mw:Image':
                return Image;
            case 'mw:Video':
                return Video;
            case 'mw:Audio':
                return Audio;
            default:
                if (typeOf.startsWith('mw:Extension/timeline')) {
                    return TimelineImage;
                }
                return Unknown;
        }
    } else if (elem.getAttribute('rel') === 'mw:MediaLink') {
        return Pronunciation;
    } else if (isMathoidImage(elem)) {
        return MathImage;
    } else {
        return Unknown;
    }
}

function getCodecs(typeStr) {
    const codecsSegment = typeStr && typeStr.split('; ')[1];
    const codecListString = codecsSegment && codecsSegment.split('"')[1];
    return codecListString && codecListString.split(', ');
}

const getStructuredSrcSet = (img) => {
    const result = [];
    ['src', 'srcset'].forEach((attr) => {
        const adjustedSrcSet = img.getAttribute(attr);
        const allSrcSet = (adjustedSrcSet && adjustedSrcSet.split(',')) || [];
        allSrcSet.forEach(srcset => {
            if (!srcset || srcset.length === 0) {
                return;
            }
            srcset = srcset.trim().split(' ');
            result.push({
                src: srcset[0],
                scale: srcset[1] || '1x',
            });
        });
    });
    return result;
};

const resolveTitleRedirects = (req, results) => {
    const titles = results.map(result => {
        return result.title;
    }).filter(title => {
        // remove empty titles
        return title;
    });

    const query = {
        action: 'query',
        redirects: true,
    };
    return api.mwApiGetQueryBatched(req, query, titles, api.getCommonsDomain(req.params.domain))
    .then((res) => {
        res && res.redirects && res.redirects.forEach(redirect => {
            // check if result is a redirect
            if (!redirect.from && !redirect.to) {
                return;
            }
            for (let i = 0; i < results.length; i++) {
                if (results[i].title === redirect.from.replace(globalSpaceRegex, '_')) {
                    results[i].title = redirect.to.replace(globalSpaceRegex, '_');
                    break;
                }
            }
        });
        return results;
    });
};

/**
 * Get file page titles from a NodeList of media elements from Parsoid HTML
 *
 * @param {!Document} doc Parsoid HTML document
 * @return {!Array} array containing the information on the media items on the page, in order of
 *          appearance
 */
function getMediaItemInfoFromDoc(doc) {
    const walker = doc.createTreeWalker(doc.body);
    let elem;
    const results = [];
    while ((elem = walker.nextNode())) {
        if (elem.nodeType !== NodeType.ELEMENT_NODE) {
            continue;
        }

        const mediaType = getMediaType(elem);
        if (mediaType === Unknown) {
            continue;
        }

        const resource = mediaType.selector && elem.querySelector(mediaType.selector) || elem;

        if (mediaType === Image
            && (thumbnail.isTooSmall(resource) || thumbnail.isDisallowed(elem))) {
            continue;
        }
        const figCaption = elem.querySelector('figcaption');
        const caption = figCaption && {
            html: figCaption.innerHTML,
            text: figCaption.textContent
        };
        const section = elem.closest('section') || undefined;
        const sectionId = section && parseInt(section.getAttribute('data-mw-section-id'), 10);
        const gallery = elem.closest('.gallery') || undefined;
        const galleryId = gallery && gallery.getAttribute('id');
        const resourceAttribute = resource && resource.getAttribute('resource');
        const title =  resourceAttribute && decodeURIComponent(resourceAttribute.replace(leadingDotSlashRegex, ''));
        let startTime;
        let endTime;
        let thumbTime;
        let audioType;
        let sources;
        let original;
        let srcset;
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
                    codecs: getCodecs(source.getAttribute('type')),
                    name: source.getAttribute('data-title'),
                    short_name: source.getAttribute('data-shorttitle'),
                    width: source.getAttribute('data-file-width') || source.getAttribute('data-width'),
                    height: source.getAttribute('data-file-height') || source.getAttribute('data-height')
                };
            });
        } else if (mediaType === Pronunciation) {
            audioType = 'pronunciation';
        } else if (mediaType === Audio) {
            audioType = elem.closest(SpokenWikipediaId) ? 'spoken' : 'generic';
        } else if (mediaType === MathImage) {
            original = { source: elem.getAttribute('src'), mime: 'image/svg' };
        } else if (mediaType === TimelineImage) {
            const img = elem.querySelector('img');
            if (!img) {
                continue;
            }
            const src = img.getAttribute('src');
            if (!src.endsWith('.png')) {
                continue;
            }
            original = { source: src, mime: 'image/png' };
        } else if (mediaType === Image) {
            const img = elem.querySelector('img');
            thumbnail.scaleElementIfNecessary(img);
            const structuredSrcSet = getStructuredSrcSet(img);
            srcset = structuredSrcSet.length ? structuredSrcSet : undefined;
        }
        const result = {
            title: mwapi.getCanonicalFileTitle(title) || undefined,
            section_id: sectionId,
            type: mediaType.name,
            caption,
            start_time: startTime,
            end_time: endTime,
            thumb_time: thumbTime,
            audio_type: audioType,
            gallery_id: galleryId,
            sources,
            showInGallery: mediaType === Image || mediaType === Video,
            srcset,
        };
        // Only add 'original' if defined, to avoid otherwise changing the order of properties below
        if (original) {
            result.original = original;
        }
        results.push(result);
    }
    return _.uniq(results, elem => (elem.title || elem.original.source));
}

/**
 * Get file page titles from a NodeList of media elements from Parsoid HTML
 *
 * @param {!string} html raw Parsoid HTML
 * @return {!Array} array containing the information on the media items on the page, in order of
 *          appearance
 */
function getMediaItemInfoFromPage(html) {
    return getMediaItemInfoFromDoc(domino.createDocument(html));
}

function combineResponses(apiResponse, pageMediaList) {
    return pageMediaList.map((mediaItem) => {
        if (mediaItem.title) {
            Object.assign(mediaItem, apiResponse[mediaItem.title]);
        }
        delete mediaItem.title;

        // delete 'original' property for videos
        if (mediaItem.sources) {
            delete mediaItem.original;
        }
        return mediaItem;
    });
}

module.exports = {
    getMediaItemInfoFromDoc,
    getMediaItemInfoFromPage,
    combineResponses,
    resolveTitleRedirects,
    testing: {
        imageName: Image.name,
        videoName: Video.name,
        audioName: Audio.name,
        getCodecs,
        getStructuredSrcSet,
    }
};
