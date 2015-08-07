/**
 * Common DOM transformations for mobile apps.
 * We rearrange some content and remove content that is not shown/needed.
 */

'use strict';

var BBPromise = require('bluebird');
var mwapi = require('../lib/mwapi');

// gallery constants:
var MAX_ITEM_COUNT = 256;
var MIN_IMAGE_SIZE = 64;
var MAX_IMAGE_WIDTH = 1280;

// in the case of video, look for a list of transcodings, so that we might
// find a WebM version, which is playable in Android.
function getTranscodedVideoUrl(objinfo) {
    var derivativesArr, derivative, url, key;
    if (objinfo.derivatives) {
        derivativesArr = objinfo.derivatives;
        for (key in derivativesArr) {
            if (derivativesArr.hasOwnProperty(key)) {
                derivative = derivativesArr[key];
                if (derivative.type && derivative.type.indexOf("webm") > -1) {
                    // that's the one!
                    url = derivative.src;
                    // Note: currently picks the last one
                    // TODO: in the future we could have an extra URL that provides a size parameter for images and videos
                }
            }
        }
    }
    return url;
}

function getExtMetadata(extmetadata) {
    var ext = {};
    for (var key in extmetadata) {
        if (extmetadata.hasOwnProperty(key)) {
            var value = extmetadata[key].value;
            if (typeof value === "string") {
                ext[key] = value.trim();
            }
        }
    }
    return ext;
}

function handleGalleryItems(item) {
    var obj, url;

    if (item.imageinfo) {
        obj = item.imageinfo[0];
    } else if (item.videoinfo) {
        obj = item.videoinfo[0];
        url = getTranscodedVideoUrl(obj);
    }
    if (!url) {
        url = obj.url;
    }
    return {
        title: item.title,
        url: url,
        thumbUrl: obj.thumbUrl,
        mimeType: obj.mimeType,
        width: obj.width,
        height: obj.height,
        ext: getExtMetadata(obj.extmetadata)
    };
}

function onGalleryItemsResponse(logger, response) {
    var items, key;
    var output = [];

    mwapi.checkApiResponse(response);
    mwapi.checkForQueryPagesInResponse(logger, response);

    items = response.body.query.pages;
    for (key in items) {
        if (items.hasOwnProperty(key)) {
            output.push(handleGalleryItems(items[key]));
        }
    }

    return output;
}

/** Returns a promise to retrieve one or more gallery items. */
function galleryItemsPromise(logger, domain, titles, params) {
    Object.assign(params, {
        "action": "query",
        "format": "json",
        "titles": titles,
        "continue": ""
    });

    return mwapi.apiGet(domain, params)
        .then(function (response) {
            return onGalleryItemsResponse(logger, response);
        });
}

function onGalleryCollectionsResponse(logger, response, domain) {
    var detailsPromises = [], videos = [], images = [];
    var isVideo;

    mwapi.checkApiResponse(response);
    if (!response.body.query || !response.body.query.pages) {
        return [];
    }

    // iterate over all items
    var items = response.body.query.pages;
    for (var key in items) {
        if (items.hasOwnProperty(key)) {
            var item = items[key];

            if (!(item.imageinfo && Array.isArray(item.imageinfo) && item.imageinfo.length)) {
                continue;
            }

            // remove the ones that are too small or are of the wrong type
            var imageinfo = item.imageinfo[0];  // TODO: why this is an array?

            // Reject gallery items if they're too small.
            // Also reject SVG and PNG items by default, because they're likely to be
            // logos and/or presentational images.
            if (imageinfo.width < MIN_IMAGE_SIZE
                || imageinfo.height < MIN_IMAGE_SIZE
                || imageinfo.mime.indexOf("svg") > -1
                || imageinfo.mime.indexOf("png") > -1
            ) {
                delete items[key];
            } else {
                delete item.ns;
                delete item.imagerepository; // we probably don't care where the repo is
                delete imageinfo.size;
                // TODO instead of deleting properties we probably want to just add well-known properties

                isVideo = imageinfo.mime.indexOf("ogg") > -1 || imageinfo.mime.indexOf("video") > -1;

                // request details individually, to keep the order
                //detailsPromises.push(galleryItemsPromise(domain, item.title, isVideo));

                if (isVideo) {
                    videos.push(item.title);
                } else {
                    images.push(item.title);
                }
            }
        }
    }

    // one more request for all videos
    if (videos.length > 0) {
        detailsPromises.videos = galleryItemsPromise(logger, domain, videos.join('|'), {
            "prop": "videoinfo",
            "viprop": "url|dimensions|mime|extmetadata|derivatives",
            "viurlwidth": MAX_IMAGE_WIDTH
        });
    }

    // another request for all images
    if (images.length > 0) {
        detailsPromises.images = galleryItemsPromise(logger, domain, images.join('|'), {
            "prop": "imageinfo",
            "iiprop": "url|dimensions|mime|extmetadata",
            "iiurlwidth": MAX_IMAGE_WIDTH
        });
    }

    return detailsPromises;
}

/** Gets the gallery content from MW API */
function collectionPromise(logger, domain, title) {
    return mwapi.apiGet(domain, {
        "action": "query",
        "format": "json",
        "titles": title,
        "continue": "",
        "prop": "imageinfo",
        "iiprop": "dimensions|mime",
        "generator": "images",
        "gimlimit": MAX_ITEM_COUNT,
        "redirects": true
    }).then(function (response) {
        var detailsPromises = onGalleryCollectionsResponse(logger, response, domain);
        return BBPromise.props({
            videos: detailsPromises.videos,
            images: detailsPromises.images
        });
    });
}

module.exports = {
    collectionPromise: collectionPromise
};