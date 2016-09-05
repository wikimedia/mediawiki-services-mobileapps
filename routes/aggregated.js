/**
 * Route for fetching aggregated app feed content.
 */

'use strict';

var BBPromise = require('bluebird');
var preq = require('preq');
var sUtil = require('../lib/util');
var mUtil = require('../lib/mobile-util');
var mwapi = require('../lib/mwapi');
var dateUtil = require('../lib/dateUtil');
var mostRead = require('../lib/feed/most-read');
var featured = require('../lib/feed/featured');
var featuredImage = require('../lib/feed/featured-image');
var random = require('../lib/feed/random');
var news = require('../lib/feed/news');

/**
 * The main router object
 */
var router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
var app;

/**
 * GET {domain}/api/rest_v1/feed/featured/{yyyy}/{mm}/{dd}
 * Returns aggregated feed content for the date requested.
 */
router.get('/featured/:yyyy/:mm/:dd', function (req, res) {
    var dateString = dateUtil.dateStringFrom(req);
    // signal that this is a request for aggregated resources
    req.query = req.query || {};
    req.query.aggregated = true;
    return BBPromise.props({
        tfa: featured.promise(app, req),
        mostread: mostRead.promise(app, req),
        random: random.promise(app, req),
        news: news.promise(app, req),
        image: featuredImage.promise(app, req)
    }) .then(function (response) {
        var aggregate = {
            tfa: response.tfa.payload,
            random: mwapi.buildTitleResponse(response.random.payload),
            mostread: response.mostread.payload,
            news: response.news.payload,
            image: response.image.payload
        };
        res.status(200);
        mUtil.setETagToValue(res, mUtil.getDateStringEtag(dateString));
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.aggregatedFeed);
        res.json(aggregate).end();
    });
});

module.exports = function (appObj) {
    app = appObj;
    return {
        path: '/feed',
        api_version: 1,
        router: router
    };
};
