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
var mUtil = require('../lib/mobile-util');
var transforms = require('../lib/transforms');
var mwapi = require('../lib/mwapi');
var gallery = require('../lib/gallery');
var domino = require('domino');
var extract = require('../lib/extract');

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
function pageContentPromise(logger, domain, title) {
    return mwapi.getAllSections(logger, domain, title)
    .then(function (response) {
        var page = response.body.mobileview;
        var sections = response.body.mobileview.sections;
        var section;

        // transform all sections
        for (var idx = 0; idx < sections.length; idx++) {
            section = sections[idx];
            section.text = transforms.runDomTransforms(section.text, idx, page);
        }

        // if (!response.body.mobileview.mainpage) {
            // don't do anything if this is the main page, since many wikis
            // arrange the main page in a series of tables.
            // TODO: should we also exclude file and other special pages?
            // sections[0].text = transforms.moveFirstParagraphUpInLeadSection(sections[0].text);
        // }

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

function sanitizeEmptyProtection(protection) {
    if (Array.isArray(protection)) {
        return undefined; // MediaWiki API returns an empty array instead of an empty object, ouch!
    }
    return protection;
}

function parseExtract(body) {
    var id = Object.keys(body.query.pages)[0];
    var page = body.query.pages[id];
    return page && extract.format(page.extract);
}

function buildLead(input, domain) {
    var lead = domino.createDocument(input.page.sections[0].text);
    return {
        id: input.page.id,
        revision: input.page.revision,
        lastmodified: input.page.lastmodified,
        displaytitle: input.page.displaytitle,
        normalizedtitle: input.page.normalizedtitle,
        redirected: input.page.redirected,
        description: input.page.description,
        protection: sanitizeEmptyProtection(input.page.protection),
        editable: input.page.editable,
        mainpage: input.page.mainpage,
        languagecount: input.page.languagecount,
        image: mUtil.defaultVal(mUtil.filterEmpty({
            file: input.page.image && input.page.image.file,
            urls: input.page.thumb && mwapi.buildLeadImageUrls(input.page.thumb.url)
        })),
        extract: input.extract && parseExtract(input.extract.body),
        infobox: transforms.parseInfobox(lead),
        pronunciation: transforms.parsePronunciation(lead, domain),
        spoken: input.page.spoken,
        geo: transforms.parseGeo(lead),
        sections: buildLeadSections(input.page.sections),
        media: input.media
    };
}

function buildRemaining(input) {
    return {
        sections: input.page.sections.slice(1) // don't repeat the first section
    };
}

function buildAll(input, domain) {
    return {
        lead: buildLead(input, domain),
        remaining: buildRemaining(input)
    };
}

/**
 * GET {domain}/v1/page/mobile-html-sections/{title}
 * Gets the mobile app version of a given wiki page.
 */
router.get('/mobile-html-sections/:title', function (req, res) {
    return BBPromise.props({
        page: pageContentPromise(req.logger, req.params.domain, req.params.title),
        media: gallery.collectionPromise(req.logger, req.params.domain, req.params.title)
    }).then(function (response) {
        response = buildAll(response, req.params.domain);
        res.status(200);
        mUtil.setETag(res, response.lead.revision);
        res.json(response).end();
    });
});

/**
 * GET {domain}/v1/page/mobile-html-sections-lead/{title}
 * Gets the lead section for the mobile app version of a given wiki page.
 */
router.get('/mobile-html-sections-lead/:title', function (req, res) {
    return BBPromise.props({
        page: pageContentPromise(req.logger, req.params.domain, req.params.title),
        media: gallery.collectionPromise(req.logger, req.params.domain, req.params.title),
        extract: mwapi.requestExtract(req.params.domain, req.params.title)
    }).then(function (response) {
        response = buildLead(response, req.params.domain);
        res.status(200);
        mUtil.setETag(res, response.revision);
        res.json(response).end();
    });
});

/**
 * GET {domain}/v1/page/mobile-html-sections-remaining/{title}
 * Gets the remaining sections for the mobile app version of a given wiki page.
 */
router.get('/mobile-html-sections-remaining/:title', function (req, res) {
    return BBPromise.props({
        page: pageContentPromise(req.logger, req.params.domain, req.params.title)
    }).then(function (response) {
        res.status(200);
        mUtil.setETag(res, response.page.revision);
        res.json(buildRemaining(response)).end();
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
