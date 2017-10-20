'use strict';

const BBPromise = require('bluebird');
const mwapi = require('./mwapi');
const api = require('./api-util');

const MAX_ITEM_COUNT = 256;
const MIN_IMAGE_SIZE = 64;
const MAX_IMAGE_WIDTH = 1280;


function getExtMetadataValues(extmetadata) {
    const ext = {};
    Object.keys(extmetadata).forEach((key) => {
        ext[key] = extmetadata[key].value;
    });
    return ext;
}

function handleGalleryItems(item) {
    let obj;
    if (item.imageinfo) {
        obj = item.imageinfo[0];
    } else if (item.videoinfo) {
        obj = item.videoinfo[0];
    }
    return {
        title: item.title,
        url: obj.url,
        thumbUrl: obj.thumburl,
        mime: obj.mime,
        width: obj.width,
        height: obj.height,
        derivatives: obj.derivatives,
        ext: getExtMetadataValues(obj.extmetadata)
    };
}

function onGalleryItemsResponse(req, response) {
    mwapi.checkForQueryPagesInResponse(req, response);

    const output = [];
    response.body.query.pages.forEach((item) => {
        output.push(handleGalleryItems(item));
    });
    return output;
}

/** Returns a promise to retrieve one or more gallery items. */
function galleryItemsPromise(app, req, titles, params) {
    Object.assign(params, {
        action: 'query',
        format: 'json',
        formatversion: 2,
        titles,
        continue: ''
    });

    return api.mwApiGet(app, req.params.domain, params)
        .then((response) => {
            return onGalleryItemsResponse(req, response);
        });
}

function onGalleryCollectionsResponse(app, req, response) {
    const detailsPromises = {};
    const images = [];
    let isVideo;
    const videos = [];

    if (!response.body.query || !response.body.query.pages) {
        return {};
    }

    // Reject gallery items if they're too small.
    // Also reject SVG and PNG items by default, because they're likely to be
    // logos and/or presentational images.
    const items = response.body.query.pages.filter((page) => {
        const imageInfo = page.imageinfo && Array.isArray(page.imageinfo) && page.imageinfo[0];
        return imageInfo
            && imageInfo.width >= MIN_IMAGE_SIZE
            && imageInfo.height >= MIN_IMAGE_SIZE
            && !imageInfo.mime.includes('svg')
            && !imageInfo.mime.includes('png');
    });

    items.forEach((item) => {
        delete item.ns;
        delete item.imagerepository; // we probably don't care where the repo is
        delete item.imageinfo[0].size;
        // TODO: instead of deleting properties we probably want to just add well-known
        // properties

        const mime = item.imageinfo[0].mime;
        isVideo = mime.indexOf('ogg') > -1 || mime.indexOf('video') > -1;

        // request details individually, to keep the order
        // detailsPromises.push(galleryItemsPromise(domain, item.title, isVideo));

        if (isVideo) {
            videos.push(item.title);
        } else {
            images.push(item.title);
        }
    });

    // one more request for all videos
    if (videos.length > 0) {
        detailsPromises.videos = galleryItemsPromise(app, req, videos.join('|'), {
            prop: 'videoinfo',
            viprop: 'url|dimensions|mime|extmetadata|derivatives',
            viurlwidth: MAX_IMAGE_WIDTH
        });
    }

    // another request for all images
    if (images.length > 0) {
        detailsPromises.images = galleryItemsPromise(app, req, images.join('|'), {
            prop: 'imageinfo',
            iiprop: 'url|dimensions|mime|extmetadata',
            iiurlwidth: MAX_IMAGE_WIDTH
        });
    }

    return detailsPromises;
}

/** Gets the gallery content from MW API */
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
    return api.mwApiGet(app, req.params.domain, query)
    .then((response) => {
        const detailsPromises = onGalleryCollectionsResponse(app, req, response);
        return BBPromise.props({
            videos: detailsPromises.videos,
            images: detailsPromises.images
        }).then((result) => {
            const images = result.images || [];
            const videos = result.videos || [];
            const both = images + videos;
            return both.length ? { items: result.images.concat(result.videos) } : {};
        });
    });
}

module.exports = {
    collectionPromise
};
