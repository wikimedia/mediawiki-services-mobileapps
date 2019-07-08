'use strict';

const sUtil = require('../../lib/util');
const mUtil = require('../../lib/mobile-util');
const news = require('../../lib/feed/news');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET {domain}/api/rest_v1/page/news
 *
 * Get descriptions of current events and related article links.
 * Experimental and English-only.
 */
router.get('/news', (req, res) => {
    return news.promise(app, req)
    .then((response) => {
        if (response.payload) {
            mUtil.setETag(res, response.meta && response.meta.etag);
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
