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

function moveFirstParagraphUpInLeadSection(text) {
    var doc = domino.createDocument(text);
    // TODO: mhurd: feel free to add your lead section magic here
    return doc.body.innerHTML;
}

/**
 * Nukes stuff from the DOM we don't want.
 */
function runDomTransforms(text) {
    var doc = domino.createDocument(text);
    rmSelectorAll(doc, 'div.noprint');
    rmSelectorAll(doc, 'div.infobox');
    rmSelectorAll(doc, 'div.hatnote');
    rmSelectorAll(doc, 'div.metadata');
    rmSelectorAll(doc, 'table'); // TODO: later we may want to transform some of the tables into a JSON structure
    // TODO: mhurd: add more references to functions where you do more transforms here
    return doc.body.innerHTML;
}

function checkApiResult(apiRes) {
    // check if the query failed
    if (apiRes.status > 299) {
        // there was an error in the MW API, propagate that
        throw new HTTPError({
            status: apiRes.status,
            type: 'api_error',
            title: 'MW API error',
            detail: apiRes.body
        });
    }
}

function checkForQueryPagesIn(apiRes) {
    if (!apiRes.body.query || !apiRes.body.query.pages) {
        // we did not get our expected query.pages from the MW API, propagate that
        console.log('ERROR: no query.pages in result: ' + JSON.stringify(apiRes, null, 2));
        throw new HTTPError({
            status: apiRes.status,
            type: 'api_error',
            title: 'no query.pages in result',
            detail: apiRes.body
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
        "noheadings": true,
        "noimages": true
    })
        .then(function (result) {
            checkApiResult(result);

            // transform all sections
            var sections = result.body.mobileview.sections;
            for (var idx = 0; idx < sections.length; idx++) {
                var section = sections[idx];
                section.text = runDomTransforms(section.text);
            }

            if (!result.body.mobileview.mainpage) {
                // don't do anything if this is the main page, since many wikis
                // arrange the main page in a series of tables.
                // TODO: should we also exclude file and other special pages?
                sections[0].text = moveFirstParagraphUpInLeadSection(sections[0].text);
            }

            return result.body.mobileview;
        });
}

/** Returns a promise to retrieve one or more gallery items. */
function galleryItemsPromise(domain, titles, params) {
    Object.assign(params, {
        "action": "query",
        "format": "json",
        "titles": titles,
        "continue": ""
    });
    //console.log("DEBUG: " + JSON.stringify(params, null, 2));

    return apiGet(domain, params)
        .then(function (result) {
            checkApiResult(result);
            checkForQueryPagesIn(result);

            // TODO: iterate over all items and massage the data
            //var items = result.body.query.pages;
            //for (var key in items) {
            //    if (items.hasOwnProperty(key)) {
            //        var item = items[key];
            //        //console.log("-----");
            //        //console.log(item);
            //    }
            //}

            return result.body.query.pages;
        });
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
        .then(function (result) {
            var detailsPromises = [];
            var videos = [], images = [];
            var isVideo;

            checkApiResult(result);
            checkForQueryPagesIn(result);

            // iterate over all items
            var items = result.body.query.pages;
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
                detailsPromises.push(galleryItemsPromise(domain, videos.join('|'), {
                    "prop": "videoinfo",
                    "viprop": "url|dimensions|mime|extmetadata|derivatives",
                    "viurlwidth": MAX_IMAGE_WIDTH,
                }));
            }

            // another one request for all the images
            if (images.length > 0) {
                detailsPromises.push(galleryItemsPromise(domain, images.join('|'), {
                    "prop": "imageinfo",
                    "iiprop": "url|dimensions|mime|extmetadata",
                    "iiurlwidth": MAX_IMAGE_WIDTH
                }));
            }

            if (detailsPromises.length > 0) {
                // bring all gallery info items together
                return BBPromise.all(detailsPromises);
            } else {
                // no media associated with the page
                return BBPromise.resolve({});
            }
        });
}

/**
 * GET {domain}/v1/mobileapp/{title}
 * Gets the mobile app version of a given wiki page.
 */
router.get('/mobileapp/:title', function (req, res) {
    BBPromise.props({
        page: pageContentPromise(req.params.domain, req.params.title),
        gallery: galleryCollectionPromise(req.params.domain, req.params.title)
    }).then(function(result) {
        res.status(200).type('json').end(JSON.stringify(result));
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

