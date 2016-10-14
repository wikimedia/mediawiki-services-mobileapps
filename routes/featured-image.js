/**
 * Picture of the day
 */

'use strict';

var mUtil = require('../lib/mobile-util');
var sUtil = require('../lib/util');
var featured = require('../lib/feed/featured-image');

/**
 * The main router object
 */
var router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
var app;

/**
 * GET {domain}/v1/media/image/featured/{year}/{month}/{day}
 * Gets the title and other metadata for the picture of the day of a given date.
 * ETag is set to the pageid and the revision.
 */
router.get('/image/featured/:yyyy/:mm/:dd', function (req, res) {
    return featured.promise(app, req)
        .then(function (response) {
            res.status(!response.payload ? 204 : 200);
            mUtil.setETagToValue(res, response.meta && response.meta.etag);
            res.json(response.payload || null).end();
        });
});

module.exports = function (appObj) {
    app = appObj;
    return {
        path: '/media',
        api_version: 1,
        router: router
    };
};
