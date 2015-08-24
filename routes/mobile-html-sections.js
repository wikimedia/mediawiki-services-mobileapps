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
    if (app.conf.debug) {
        //console.log("DEBUG: " + name + ": " + JSON.stringify(obj, null, 2));
        app.logger.log('debug', name + ": " + JSON.stringify(obj));
    }
}

/** Returns a promise to retrieve the page content from MW API mobileview */
function pageContentPromise(domain, title) {
    return mwapi.getAllSections(domain, title)
    .then(function (response) {
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

function buildLeadSections(sections) {
    var out = [],
        section,
        len = sections.length;

    out.push(sections[0]);
    for (var i = 1; i < len; i++) {
        section = sections[i];
        var item = {
            id: section.id,
            toclevel: section.toclevel,
            anchor: section.anchor,
            line: section.line
        };
        out.push(item);
    }
    return out;
}

function buildLead(input) {
    return {
        id: input.page.id,
        revision: input.page.revision,
        lastmodified: input.page.lastmodified,
        displaytitle: input.page.displaytitle,
        protection: input.page.protection,
        editable: input.page.editable,
        languagecount: input.page.languagecount,
        image: {
            file: input.page.image && input.page.image.file,
            urls: input.page.thumb && mwapi.buildLeadImageUrls(input.page.thumb.url)
        },
        media: input.media,
        sections: buildLeadSections(input.page.sections)
    };
}

function buildRemaining(input) {
    return {
        sections: input.page.sections.slice(1) // don't repeat the first section
    };
}

function buildAll(input) {
    return {
        lead: buildLead(input),
        remaining: buildRemaining(input)
    };
}

/**
 * GET {domain}/v1/page/mobile-html-sections/{title}
 * Gets the mobile app version of a given wiki page.
 */
router.get('/mobile-html-sections/:title', function (req, res) {
    return BBPromise.props({
        page: pageContentPromise(req.params.domain, req.params.title),
        media: gallery.collectionPromise(req.logger, req.params.domain, req.params.title)
    }).then(function (response) {
        res.status(200).json(buildAll(response)).end();
    });
});

/**
 * GET {domain}/v1/page/mobile-html-sections-lead/{title}
 * Gets the lead section for the mobile app version of a given wiki page.
 */
router.get('/mobile-html-sections-lead/:title', function (req, res) {
    return BBPromise.props({
        page: pageContentPromise(req.params.domain, req.params.title),
        media: gallery.collectionPromise(req.logger, req.params.domain, req.params.title)
    }).then(function (response) {
        res.status(200).json(buildLead(response)).end();
    });
});

/**
 * GET {domain}/v1/page/mobile-html-sections-remaining/{title}
 * Gets the remaining sections for the mobile app version of a given wiki page.
 */
router.get('/mobile-html-sections-remaining/:title', function (req, res) {
    return BBPromise.props({
        page: pageContentPromise(req.params.domain, req.params.title)
    }).then(function (response) {
        res.status(200).json(buildRemaining(response)).end();
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

