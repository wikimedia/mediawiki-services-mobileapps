/**
 * Route for fetching aggregated app feed content.
 */

'use strict';

var BBPromise = require('bluebird');
var preq = require('preq');
var sUtil = require('../lib/util');
var mUtil = require('../lib/mobile-util');
var dateUtil = require('../lib/dateUtil');
var media = require('../lib/feed/media');
var mostRead = require('../lib/feed/most-read');
var featured = require('../lib/feed/featured');
var random = require('../lib/feed/random');

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
    return BBPromise.props({
        tfa: featured.promise(app, req, true),
        mostread: mostRead.promise(app, dateUtil.yesterday(req)),
        random: random.promise(app, req)
        //news: news.promise(app, req),
        //image: media.featuredImagePromise(app, req),
        //video: media.featuredVideoPromise(app, req)
    }) .then(function (response) {
        var aggregate = {
            tfa: response.tfa.payload,
            random: response.random.payload,
            mostread: response.mostread.payload,
            news: 'Articles in the news here',
            image: 'Today\'s featured image here',
            video: 'Today\'s featured video here'
        };
        res.status(200);
        mUtil.setETagToValue(res, mUtil.getDateStringEtag(dateString));
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
