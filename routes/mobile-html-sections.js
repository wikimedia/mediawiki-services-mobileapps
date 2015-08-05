/**
 * mobileapp provides page content for the Mobile Apps.
 * The goal is to avoid having to use a web view and style the content natively inside the app
 * using plain TextViews.
 * The payload should not have any extra data, and should be easy to consume by the apps.
 *
 * Status: Prototype -- not ready for production
 * Currently using the mobileview action MW API, and removing some data we don't display.
 * TODO: add some transformations that currently are being done by the apps and remove some more unneeded data
 */

'use strict';

var BBPromise = require('bluebird');
var preq = require('preq');
var sUtil = require('../lib/util');
var transforms = require('../lib/transforms');
var mwapi = require('../lib/mwapi');
var gallery = require('../lib/gallery');

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

function dbg(name, obj) {
    //console.log("DEBUG: " + name + ": " + JSON.stringify(obj, null, 2));
    app.logger.log('debug', name + ": " + JSON.stringify(obj));
}

/** Returns a promise to retrieve the page content from MW API mobileview */
function pageContentPromise(domain, title) {
    return mwapi.getAllSections(domain, title)
    .then(function (response) {
        mwapi.checkApiResponse(response);

        // transform all sections
        var sections = response.body.mobileview.sections;
        for (var idx = 0; idx < sections.length; idx++) {
            var section = sections[idx];
            section.text = transforms.runDomTransforms(section.text, idx);
        }

        if (!response.body.mobileview.mainpage) {
            // don't do anything if this is the main page, since many wikis
            // arrange the main page in a series of tables.
            // TODO: should we also exclude file and other special pages?
            sections[0].text = transforms.moveFirstParagraphUpInLeadSection(sections[0].text);
        }

        return response.body.mobileview;
    });
}

/**
 * GET {domain}/v1/page/mobile-html-sections/{title}
 * Gets the mobile app version of a given wiki page.
 */
router.get('/mobile-html-sections/:title', function (req, res) {
    BBPromise.props({
        page: pageContentPromise(req.params.domain, req.params.title),
        media: gallery.collectionPromise(req.logger, req.params.domain, req.params.title)
    }).then(function (response) {
        res.status(200).type('json').end(JSON.stringify(response));
    });
});

module.exports = function (appObj) {
    app = appObj;
    return {
        path: '/page',
        api_version: 1,
        router: router
    };
};

