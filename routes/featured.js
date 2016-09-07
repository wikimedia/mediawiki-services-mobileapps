/**
 * Featured article of the day
 */

'use strict';

var mUtil = require('../lib/mobile-util');
var sUtil = require('../lib/util');
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
 * GET {domain}/v1/page/featured/{year}/{month}/{day}
 * Gets the title and other metadata for a featured article of a given date.
 * ETag is set to the pageid. This should be specific enough.
 */
router.get('/featured/:yyyy/:mm/:dd', function (req, res) {
    return featured.promise(app, req)
        .then(function (response) {
            res.status(200);
            mUtil.setETagToValue(res, response.meta && response.meta.etag);
            mUtil.setContentType(res, mUtil.CONTENT_TYPES.unpublished);
            res.json(response.payload || {}).end();
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
