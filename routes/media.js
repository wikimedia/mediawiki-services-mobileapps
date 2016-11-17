'use strict';

const BBPromise = require('bluebird');
const mUtil = require('../lib/mobile-util');
const parsoid = require('../lib/parsoid-access');
const sUtil = require('../lib/util');
const gallery = require('../lib/gallery');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET {domain}/v1/page/media/{title}
 * Gets the media items associated with the given page.
 */
router.get('/media/:title', function (req, res) {
    return BBPromise.props({
        page: parsoid.pageContentPromise(app, req),
        media: gallery.collectionPromise(app, req)
    }).then(function (response) {
        res.status(200);
        mUtil.setETag(req, res, response.page.revision);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.unpublished);
        res.json(response.media).end();
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
