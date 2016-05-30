/**
 * Route for fetching aggregated app feed content.
 */

'use strict';

var BBPromise = require('bluebird');
var preq = require('preq');
var sUtil = require('../lib/util');
var mUtil = require('../lib/mobile-util');
var media = require('../lib/feed/media');
var mostRead = require('../lib/feed/most-read');
var featured = require('../lib/feed/featured');

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
    return BBPromise.props({
        tfa: featured.promise(app, req),
        mostread: mostRead.promise(app, req),
        random: 'Good random article here',//random.promise(app, req),
        news: 'Articles in the news here', //news.promise(app, req),
        image: 'Today\'s featured image here', //media.featuredImagePromise(app, req),
        video: 'Today\'s featured video here' //media.featuredVideoPromise(app, req)
    }) .then(function (response) {
        res.status(200);
        mUtil.setETag(req, res, response.revision);
        res.json(response).end();
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