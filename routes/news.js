'use strict';

var sUtil = require('../lib/util');
var mUtil = require('../lib/mobile-util');
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
 * GET {domain}/api/rest_v1/page/news
 *
 * Get descriptions of current events and related article links.
 * Experimental and English-only.
 */
router.get('/news', function (req, res) {
    return news.promise(app, req)
    .then(function (response) {
        res.status(200);
        mUtil.setETagToValue(res, response.meta && response.meta.etag);
        res.json(response.payload || null).end();
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
