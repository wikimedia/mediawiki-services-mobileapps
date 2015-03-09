/**
 * mobileapp provides page content for the Mobile Apps.
 * The goal is to avoid having to use a web view and style the content natively inside the app
 * using plain TextViews.
 * The payload should not have any extra data, and should be easy to consume by the apps.
 *
 * Status: Prototype -- not ready for production
 * Currently using the mobileview action MW API, and removing some data we don't display.
 * TODO: Try Parsoid
 * TODO: add some transformations that currently are being done by the apps and remove some more unneeded data
 */

'use strict';

var BBPromise = require('bluebird');
var preq = require('preq');
var domino = require('domino');
var sUtil = require('../lib/util');

// shortcut
var HTTPError = sUtil.HTTPError;


/**
 * The main router object
 */
var router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
var app;

// gallery constants:
var MAX_ITEM_COUNT = 256;
var MIN_IMAGE_SIZE = 64;
var MAX_IMAGE_WIDTH = 1280;


function dbg(name, obj) {
    console.log("DEBUG: " + name + ": " + JSON.stringify(obj, null, 2));
}

/**
 * A helper function that obtains the HTML from the MW API and
 * loads it into a domino DOM document instance.
 *
 * @param {String} domain the domain to contact
 * @param {Object} params an Object with all the query parameters for the MW API
 * @return {Promise} a promise resolving as the HTML element object
 */
function apiGet(domain, params) {
    // get the page from the MW API
    return preq.get({
        uri: 'http://' + domain + '/w/api.php',
        query: params
    });
}

function rmSelectorAll(doc, selector) {
    var ps = doc.querySelectorAll(selector) || [];
    for (var idx = 0; idx < ps.length; idx++) {
        var node = ps[idx];
        node.parentNode.removeChild(node);
    }
}

function rmBracketSpans(doc) {
    var ps = doc.querySelectorAll('span:not([class],[style],[id])') || [];
    for (var idx = 0; idx < ps.length; idx++) {
        var node = ps[idx];
        if(node.innerHTML === '['){
            var leftBracket = doc.createTextNode('[');
            node.parentNode.replaceChild(leftBracket, node);
        }else if(node.innerHTML === ']'){
            var rightBracket = doc.createTextNode(']');
            node.parentNode.replaceChild(rightBracket, node);
        }
    }
}

function rmAttributeAll(doc, selector, attribute) {
    var ps = doc.querySelectorAll(selector) || [];
    for (var idx = 0; idx < ps.length; idx++) {
        var node = ps[idx];
        node.removeAttribute(attribute);
    }
}

function moveFirstParagraphUpInLeadSection(text) {
    var doc = domino.createDocument(text);
    // TODO: mhurd: feel free to add your lead section magic here
    return doc.body.innerHTML;
}

/**
 * Nukes stuff from the DOM we don't want.
 */
function runDomTransforms(text, sectionIndex) {
    var doc = domino.createDocument(text);

    var rmSelectors = [
                       'div.noprint',
                       'div.infobox',
                       'div.metadata',
                       'table.navbox',
                       'div.magnify',
                       'span[style*="display:none"]',    // Remove <span style=\"display:none;\">&nbsp;</span>
                       'span.Z3988'                      // Remove <span class=\"Z3988\"></span>
                       ];
    if(sectionIndex === 0) {
        rmSelectors.push('div.hatnote');
    }
    rmSelectorAll(doc, rmSelectors.join(', '));                     // Do single call to rmSelectorAll.

    rmAttributeAll(doc, 'a', 'rel');
    rmAttributeAll(doc, 'a,span', 'title');
    rmAttributeAll(doc, 'img', 'alt');

    rmBracketSpans(doc);

    // TODO: mhurd: add more references to functions where you do more transforms here

    return doc.body.innerHTML;
}

function checkApiResponse(response) {
    // check if the query failed
    if (response.status > 299) {
        // there was an error in the MW API, propagate that
        throw new HTTPError({
            status: response.status,
            type: 'api_error',
            title: 'MW API error',
            detail: response.body
        });
    }
}

function checkForQueryPagesIn(response) {
    if (!response.body.query || !response.body.query.pages) {
        // we did not get our expected query.pages from the MW API, propagate that
        console.log('ERROR: no query.pages in response: ' + JSON.stringify(response, null, 2));
        throw new HTTPError({
            status: response.status,
            type: 'api_error',
            title: 'no query.pages in response',
            detail: response.body
        });
    }
}

/** Returns a promise to retrieve the page content from MW API mobileview */
function pageContentPromise(domain, title) {
    return apiGet(domain, {
        "action": "mobileview",
        "format": "json",
        "page": title,
        "prop": "text|sections|thumb|image|id|revision|description|lastmodified|normalizedtitle|displaytitle|protection|editable",
        "sections": "all",
        "sectionprop": "toclevel|line|anchor",
        "noheadings": true
    })
        .then(function (response) {
            checkApiResponse(response);

            // transform all sections
            var sections = response.body.mobileview.sections;
            for (var idx = 0; idx < sections.length; idx++) {
                var section = sections[idx];
                section.text = runDomTransforms(section.text, idx);
            }

            if (!response.body.mobileview.mainpage) {
                // don't do anything if this is the main page, since many wikis
                // arrange the main page in a series of tables.
                // TODO: should we also exclude file and other special pages?
                sections[0].text = moveFirstParagraphUpInLeadSection(sections[0].text);
            }

            return response.body.mobileview;
        });
}

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

function getLicenseData(ext) {
    return {
        name: ext.License && ext.License.value,
        url: ext.LicenseUrl && ext.LicenseUrl.value,
        free: ext.NonFree && !ext.NonFree.value
    }
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
        url: url,
        thumbUrl: obj.thumbUrl,
        mimeType: obj.mimeType,
        width: obj.width,
        height: obj.height,
        license: getLicenseData(obj.extmetadata)
    };
}

function onGalleryItemsResponse(response) {
    var items, key;
    var output = [];

    checkApiResponse(response);
    checkForQueryPagesIn(response);

    // TODO: iterate over all items and massage the data
    items = response.body.query.pages;
    //console.log("-----");
    for (key in items) {
        if (items.hasOwnProperty(key)) {
            output.push(handleGalleryItems(items[key]));
        }
    }

    return output;
}

/** Returns a promise to retrieve one or more gallery items. */
function galleryItemsPromise(domain, titles, params) {
    Object.assign(params, {
        "action": "query",
        "format": "json",
        "titles": titles,
        "continue": ""
    });

    return apiGet(domain, params)
        .then(function (response) {
            return onGalleryItemsResponse(response);
        });
}

function onGalleryCollectionsResponse(response, domain) {
    var detailsPromises = [], videos = [], images = [];
    var isVideo;

    checkApiResponse(response);
    if (!response.body.query || !response.body.query.pages) {
        return [];
    }

    // iterate over all items
    var items = response.body.query.pages;
    for (var key in items) {
        if (items.hasOwnProperty(key)) {
            var item = items[key];

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

    // one more request for all the videos
    if (videos.length > 0) {
        detailsPromises.videos = galleryItemsPromise(domain, videos.join('|'), {
            "prop": "videoinfo",
            "viprop": "url|dimensions|mime|extmetadata|derivatives",
            "viurlwidth": MAX_IMAGE_WIDTH,
        });
    }

    // another one request for all the images
    if (images.length > 0) {
        detailsPromises.images = galleryItemsPromise(domain, images.join('|'), {
            "prop": "imageinfo",
            "iiprop": "url|dimensions|mime|extmetadata",
            "iiurlwidth": MAX_IMAGE_WIDTH
        });
    }

    return detailsPromises;
}

/** Gets the gallery content from MW API */
function galleryCollectionPromise(domain, title) {
    return apiGet(domain, {
        "action": "query",
        "format": "json",
        "titles": title,
        "continue": "",
        "prop": "imageinfo",
        "iiprop": "dimensions|mime",
        "generator": "images",
        "gimlimit": MAX_ITEM_COUNT
    })
        .then(function (response) {
            var detailsPromises = onGalleryCollectionsResponse(response, domain);
            return BBPromise.props({
                videos: detailsPromises.videos,
                images: detailsPromises.images
            });
        });
}

/**
 * GET {domain}/v1/mobileapp/{title}
 * Gets the mobile app version of a given wiki page.
 */
router.get('/mobileapp/:title', function (req, res) {
    BBPromise.props({
        page: pageContentPromise(req.params.domain, req.params.title),
        media: galleryCollectionPromise(req.params.domain, req.params.title)
    }).then(function(response) {
        res.status(200).type('json').end(JSON.stringify(response));
    });
});

module.exports = function (appObj) {
    app = appObj;
    return {
        path: '/',
        api_version: 1,
        router: router
    };
};

