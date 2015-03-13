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

/**
 * Nuke stuff from the DOM we don't want.
 */
function runDomTransforms(text) {
    var doc = domino.createDocument(text);
    rmSelectorAll(doc, 'div.noprint');
    rmSelectorAll(doc, 'div.infobox');
    rmSelectorAll(doc, 'div.hatnote');
    rmSelectorAll(doc, 'div.metadata');
    rmSelectorAll(doc, 'table'); // TODO: later we may want to transform some of the tables into a JSON structure
    return doc.body.innerHTML;
}

/**
 * GET {domain}/v1/mobileapp/lite/{title}
 * Gets the lite mobile app version of a given wiki page.
 */
router.get('/mobileapp/lite/:title', function (req, res) {
    // get the page content from MW API mobileview
    var apiParams = {
        "action": "mobileview",
        "format": "json",
        "page": req.params.title,
        "prop": "text|sections",
        "sections": "all",
        "sectionprop": "toclevel|line|anchor",
        "noheadings": true,
        "noimages": true
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
                section.text = runDomTransforms(section.text);
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
        path: '/',
        api_version: 1,
        router: router
    };
};

