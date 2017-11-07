'use strict';

const BBPromise = require('bluebird');
const mUtil = require('../lib/mobile-util');
const parsoid = require('../lib/parsoid-access');
const sUtil = require('../lib/util');
const mwapi = require('../lib/mwapi');
const media = require('../lib/media');

const router = sUtil.router();
let app;

/**
 * GET {domain}/v1/page/media/{title}
 * Gets the media items associated with the given page.
 */
router.get('/media/:title', (req, res) => {
    return BBPromise.props({
        page: parsoid.pageHtmlPromise(app, req),
        media: media.collectionPromise(app, req),
        siteinfo: mwapi.getSiteInfo(app, req)
    }).then((response) => {
        if (response.media.items && response.media.items.length > 1) {
            media.sort(response.page.html, response.media, response.siteinfo);
        }
        res.status(200);
        mUtil.setETag(res, response.page.meta.revision);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.unpublished);
        res.json(response.media).end();
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
