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
var domino = require('domino');
var mwapi = require('../lib/mwapi');
var mUtil = require('../lib/mobile-util');
var parse = require('../lib/parseProperty');
var parsoid = require('../lib/parsoid-access');
var sUtil = require('../lib/util');
var transforms = require('../lib/transforms');

/**
 * The main router object
 */
var router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
var app;

/** Returns a promise to retrieve the page content from MW API mobileview */
function pageContentForMainPagePromise(logger, domain, title) {
    return mwapi.getAllSections(logger, domain, title)
    .then(function (response) {
        var page = response.body.mobileview;
        var sections = page.sections;
        var section;

        // transform all sections
        for (var idx = 0; idx < sections.length; idx++) {
            section = sections[idx];
            section.text = transforms.runMainPageDomTransforms(section.text);
        }

        page.sections = sections;
        return page;
    });
}

/** Returns a promise to retrieve the page content from MW API mobileview */
function pageMetadataPromise(logger, domain, title) {
    return mwapi.getMetadata(logger, domain, title)
    .then(function (response) {
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

function buildLead(input) {
    var lead = domino.createDocument(input.page.sections[0].text);
    return {
        id: input.meta.id,
        revision: input.page.revision,
        lastmodified: input.page.lastmodified,
        displaytitle: input.meta.displaytitle,
        normalizedtitle: input.meta.normalizedtitle,
        redirected: input.meta.redirected,
        description: input.meta.description,
        protection: sanitizeEmptyProtection(input.meta.protection),
        editable: input.meta.editable,
        mainpage: input.meta.mainpage,
        languagecount: input.meta.languagecount,
        image: mUtil.defaultVal(mUtil.filterEmpty({
            file: input.meta.image && input.meta.image.file,
            urls: input.meta.thumb && mwapi.buildLeadImageUrls(input.meta.thumb.url)
        })),
        pronunciation: parse.parsePronunciation(lead, input.meta.displaytitle),
        spoken: input.page.spoken,
        geo: input.page.geo,
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
 * For main page only, switch to mobileview content because Parsoid doesn't
 * provide a good mobile presentation of main pages.
 */
function mainPageFixPromise(req, response) {
    return pageContentForMainPagePromise(req.logger, req.params.domain, req.params.title)
    .then(function (mainPageContent) {
        return {
            page: mainPageContent,
            meta: response.meta,
            extract: response.extract
        };
    });
}

/**
 * GET {domain}/v1/page/mobile-sections/{title}
 * Gets the mobile app version of a given wiki page.
 */
router.get('/mobile-sections/:title/:revision?', function (req, res) {
    return BBPromise.props({
        page: parsoid.pageContentPromise(req.logger, app.conf.restbase_uri, req.params.domain, req.params.title, req.params.revision),
        meta: pageMetadataPromise(req.logger, req.params.domain, req.params.title)
    }).then(function (response) {
        if (response.meta.mainpage) {
            return mainPageFixPromise(req, response);
        }
        return response;
    }).then(function (response) {
        response = buildAll(response);
        res.status(200);
        mUtil.setETag(req, res, response.lead.revision);
        res.json(response).end();
    });
});

/**
 * GET {domain}/v1/page/mobile-sections-lead/{title}
 * Gets the lead section for the mobile app version of a given wiki page.
 */
router.get('/mobile-sections-lead/:title/:revision?', function (req, res) {
    return BBPromise.props({
        page: parsoid.pageContentPromise(req.logger, app.conf.restbase_uri, req.params.domain, req.params.title, req.params.revision),
        meta: pageMetadataPromise(req.logger, req.params.domain, req.params.title),
        extract: mwapi.requestExtract(req.params.domain, req.params.title)
    }).then(function (response) {
        if (response.meta.mainpage) {
            return mainPageFixPromise(req, response);
        }
        return response;
    }).then(function (response) {
        response = buildLead(response);
        res.status(200);
        mUtil.setETag(req, res, response.revision);
        res.json(response).end();
    });
});

/**
 * GET {domain}/v1/page/mobile-sections-remaining/{title}
 * Gets the remaining sections for the mobile app version of a given wiki page.
 */
router.get('/mobile-sections-remaining/:title/:revision?', function (req, res) {
    return BBPromise.props({
        page: parsoid.pageContentPromise(req.logger, app.conf.restbase_uri, req.params.domain, req.params.title, req.params.revision)
    }).then(function (response) {
        res.status(200);
        mUtil.setETag(req, res, response.page.revision);
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
