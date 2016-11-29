/**
 * Featured article of the day
 */

'use strict';

const mUtil = require('../lib/mobile-util');
const sUtil = require('../lib/util');
const featured = require('../lib/feed/featured');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET {domain}/v1/page/featured/{year}/{month}/{day}
 * Gets the title and other metadata for a featured article of a given date.
 * ETag is set to the pageid. This should be specific enough.
 */
router.get('/featured/:yyyy/:mm/:dd', (req, res) => {
    return featured.promise(app, req)
        .then((response) => {
            res.status(!response.payload ? 204 : 200);
            mUtil.setETagToValue(res, response.meta && response.meta.etag);
            mUtil.setContentType(res, mUtil.CONTENT_TYPES.unpublished);
            res.json(response.payload || null).end();
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
