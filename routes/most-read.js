'use strict';

var sUtil = require('../lib/util');
var mUtil = require('../lib/mobile-util');
var mostRead = require('../lib/feed/most-read');

/**
 * The main router object
 */
var router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
var app;

/**
 * GET {domain}/api/rest_v1/page/most-read/{yyyy}/{mm}/{dd}
 *
 * Get the raw and normalized titles, pageid, rank, number of views, and (if
 * available) a thumbnail and/or description for the top 40-50 most read
 * articles for the date requested.
 */
router.get('/most-read/:yyyy/:mm/:dd', function (req, res) {
    return mostRead.promise(app, req)
    .then(function (response) {
        res.status(200);
        mUtil.setETagToValue(res, response.meta.etag);
        res.json(response.payload).end();
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
