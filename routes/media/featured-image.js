/**
 * Picture of the day
 */

'use strict';

const mwapi = require('../../lib/mwapi');
const mUtil = require('../../lib/mobile-util');
const sUtil = require('../../lib/util');
const featured = require('../../lib/feed/featured-image');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET {domain}/v1/media/image/featured/{year}/{month}/{day}
 * Gets the title and other metadata for the picture of the day of a given date.
 * ETag is set to the pageid and the revision.
 */
router.get('/image/featured/:yyyy/:mm/:dd', (req, res) => {
    return mwapi.getSiteInfo(req)
    .then(si => featured.promise(req, si)
    .then((response) => {
        res.status(!response.payload ? 204 : 200);
        mUtil.setETag(res, response.meta.revision, response.meta.tid);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.unpublished);
        res.json(response.payload || null).end();
    }));
});

module.exports = function(appObj) {
    app = appObj;
    return {
        path: '/media',
        api_version: 1,
        router
    };
};
