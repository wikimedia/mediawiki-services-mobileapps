/**
 * mobileapp/lite provides page content for a potential lite Mobile App.
 * The goal is to avoid having to use a web view and style the content natively inside the app
 * using plain TextViews.
 * The payload should not have any extra data, and should be easy to consume by the Lite App.
 *
 * Status: Prototype -- not ready for production
 * Currently using the mobileview action MW API, and removing some data we don't display.
 * TODO: Split the "text" objects of each section into paragraph and table objects
 * TODO: add some transformations that currently are being done by the apps and remove some more unneeded data
 */

'use strict';

//var BBPromise = require('bluebird');
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

function structureThumbnail(thumbDiv) {
    var thumb = {};
    var thumbimg = thumbDiv.querySelector("img");
    if (thumbimg) {
        thumb.src = thumbimg.getAttribute("src");
    }
    var videoDiv = thumbDiv.querySelector("div.PopUpMediaTransform");
    if (videoDiv && thumbimg) {
        thumb.type = "video";
        thumb.name = thumbimg.alt;
    } else {
        thumb.type = "image";
        var alink = thumbDiv.querySelector("a");
        if (alink) {
            thumb.name = alink.href;
        }
    }
    var caption = thumbDiv.querySelector("div.thumbcaption");
    if (caption) {
        thumb.caption = caption.innerHTML;
    }
    return thumb;
}

/**
 * Nuke stuff from the DOM we don't want.
 */
function runDomTransforms(section) {
    var doc = domino.createDocument(section.text);
    rmSelectorAll(doc, 'div.noprint');
    rmSelectorAll(doc, 'div.infobox');
    rmSelectorAll(doc, 'div.hatnote');
    rmSelectorAll(doc, 'div.metadata');
    rmSelectorAll(doc, 'table'); // TODO: later we may want to transform some of the tables into a JSON structure


    // and break it down into items...
    section.items = [];
    var itemIndex = 0;
    var thumbnails, tid, thumb;

    var ps = doc.querySelectorAll("p") || [];
    for (var pid = 0; pid < ps.length; pid++) {
        var p = ps[pid];

        if (p.innerHTML.length < 4) {
            continue;
        }

        section.items[itemIndex] = {};
        section.items[itemIndex].type = "p";
        section.items[itemIndex].text = p.innerHTML;
        itemIndex++;

        // find all images in this paragraph, and append them as section items
        thumbnails = p.querySelectorAll("div.thumb") || [];
        for (tid = 0; tid < thumbnails.length; tid++) {
            thumb = thumbnails[tid];
            section.items[itemIndex] = structureThumbnail(thumb);
            itemIndex++;
        }

        // remove other inline images from this paragraph
        rmSelectorAll(p, 'img');
        // and remove this paragraph from the DOM
        p.parentNode.removeChild(p);
    }


    // find all images in this section (outside of paragraphs), and append them as section items
    thumbnails = doc.querySelectorAll("div.thumb") || [];
    for (tid = 0; tid < thumbnails.length; tid++) {
        thumb = thumbnails[tid];
        section.items[itemIndex] = structureThumbnail(thumb);
        itemIndex++;
    }




    delete section.text;
}

/**
 * GET {domain}/v1/mobile/app/page/lite/{title}
 * Gets the lite mobile app version of a given wiki page.
 */
router.get('/:title', function (req, res) {
    // get the page content from MW API mobileview
    var apiParams = {
        "action": "mobileview",
        "format": "json",
        "page": req.params.title,
        "prop": "text|sections|languagecount|thumb|image|id|revision|description|lastmodified|normalizedtitle|displaytitle|protection|editable",
        "sections": "all",
        "sectionprop": "toclevel|line|anchor",
        "thumbsize": "640",
        "noheadings": true
    };

    return apiGet(req.params.domain, apiParams)
        // and then return it
        .then(function (apiRes) {
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

            // transform all sections
            var sections = apiRes.body.mobileview.sections;
            for (var idx = 0; idx < sections.length; idx++) {
                var section = sections[idx];
                // run DOM transforms on the section...
                runDomTransforms(section);                
            }

            res.status(200).type('json').end(JSON.stringify(apiRes.body.mobileview));
            //res.status(200).type('json').end(util.inspect(apiRes.body.mobileview));
            //res.status(200).type('html').end(apiRes.innerHTML);
            //res.status(200).type('json').end(apiRes);
        });
});

module.exports = function (appObj) {
    app = appObj;
    return {
        path: '/mobile/app/page/lite',
        api_version: 1,
        router: router
    };
};

