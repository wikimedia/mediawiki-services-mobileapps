'use strict';

const sUtil = require('../../lib/util');
const mUtil = require('../../lib/mobile-util');
const mostRead = require('../../lib/feed/most-read');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET {domain}/api/rest_v1/page/most-read/{yyyy}/{mm}/{dd}
 *
 * Get the raw and normalized titles, pageid, rank, number of views, and (if
 * available) a thumbnail and/or description for the top 40-50 most read
 * articles for the date requested.
 */
router.get('/most-read/:yyyy/:mm/:dd', (req, res) => {
    return mostRead.promise(app, req)
    .then((response) => {
        if (response.payload) {
            mUtil.setETag(res, response.meta && response.meta.revision);
            mUtil.setContentType(res, mUtil.CONTENT_TYPES.unpublished);
            res.status(200).json(response.payload);
        } else {
            res.status(204).end();
        }
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
