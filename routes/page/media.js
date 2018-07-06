'use strict';

const BBPromise = require('bluebird');
const mUtil = require('../../lib/mobile-util');
const parsoid = require('../../lib/parsoid-access');
const sUtil = require('../../lib/util');
const mwapi = require('../../lib/mwapi');
const lib = require('../../lib/media');

const router = sUtil.router();
let app;

/**
 * GET {domain}/v1/page/media/{title}{/revision}{/tid}
 * Gets the media items associated with the given page.
 */
router.get('/media/:title/:revision?/:tid?', (req, res) => {
    return mwapi.getSiteInfo(app, req)
    .then(si => BBPromise.join(
        parsoid.getParsoidHtml(app, req),
        lib.getImageInfo(app, req, si),
        (html, imageInfo) => {
            const revTid = parsoid.getRevAndTidFromEtag(html.headers);
            const pageMediaList = lib.getMediaItemInfoFromPage(html.body);
            mUtil.setETag(res, revTid.revision, revTid.tid);
            mUtil.setContentType(res, mUtil.CONTENT_TYPES.media);
            mUtil.setLanguageHeaders(res, html.headers);
            res.send({
                revision: revTid.revision,
                tid: revTid.tid,
                items: lib.combineResults(imageInfo, pageMediaList)
            });
        }));
});

module.exports = function(appObj) {
    app = appObj;
    return {
        path: '/page',
        api_version: 1,
        router
    };
};
