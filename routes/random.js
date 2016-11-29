/**
 * random-card-single returns information about single random article suited
 * to card-type presentations.
 */

'use strict';

const mUtil = require('../lib/mobile-util');
const mwapi = require('../lib/mwapi');
const sUtil = require('../lib/util');
const randomPage = require('../lib/feed/random');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET {domain}/v1/page/random/title
 * Returns a single random result well suited to card-type layouts, i.e.
 * one likely to have an image url, text extract and wikidata description.
 *
 * Multiple random items are requested, but only the result having
 * the highest relative score is returned. Requesting about 12 items
 * seems to consistently produce a really "good" result.
 */
router.get('/random/title', (req, res) => {
    return randomPage.promise(app, req)
    .then((result) => {
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
router.get('/random/summary', (req, res) => {
    return randomPage.promise(app, req)
    .then((result) => {
        res.status(200);
        mUtil.setETag(req, res, result.meta.etag);
        res.json(result.payload).end();
    });
});

module.exports = function(appObj) {
    app = appObj;
    return {
        path: '/page',
        api_version: 1,
        router
    };
};
