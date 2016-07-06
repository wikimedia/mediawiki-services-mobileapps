/**
 * random-card-single returns information about single random article suited
 * to card-type presentations.
 */

'use strict';

var mUtil = require('../lib/mobile-util');
var mwapi = require('../lib/mwapi');
var sUtil = require('../lib/util');
var randomPage = require('../lib/feed/random');

/**
 * The main router object
 */
var router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
var app;

/**
 * GET {domain}/v1/page/random/title
 * Returns a single random result well suited to card-type layouts, i.e.
 * one likely to have an image url, text extract and wikidata description.
 *
 * Multiple random items are requested, but only the result having
 * the highest relative score is returned. Requesting about 12 items
 * seems to consistently produce a really "good" result.
 */
router.get('/random/title', function (req, res) {
    return randomPage.promise(app, req)
    .then(function (result) {
        res.status(200);
        mUtil.setETag(req, res, result.meta.etag);
        res.json(mwapi.buildTitleResponse(result.payload)).end();
    });
});

/**
 * DEPRECATED:
 * GET {domain}/v1/page/random/summary
 * Returns a single random result well suited to card-type layouts, i.e.
 * one likely to have an image url, text extract and wikidata description.
 *
 * Multiple random items are requested, but only the result having
 * the highest relative score is returned. Requesting about 12 items
 * seems to consistently produce a really "good" result.
 */
router.get('/random/summary', function (req, res) {
    return randomPage.promise(app, req)
    .then(function (result) {
        res.status(200);
        mUtil.setETag(req, res, result.meta.etag);
        res.json(result.payload).end();
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
