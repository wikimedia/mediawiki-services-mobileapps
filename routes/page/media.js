'use strict';

const BBPromise = require('bluebird');
const mUtil = require('../../lib/mobile-util');
const parsoid = require('../../lib/parsoid-access');
const sUtil = require('../../lib/util');
const mwapi = require('../../lib/mwapi');
const lib = require('../../lib/media');
const imageinfo = require('../../lib/imageinfo');

const router = sUtil.router();
let app;

function getDeduplicatedTitles(list) {
    return mUtil.deduplicate(list.filter(i => i.title).map(i => i.title));
}

/**
 * GET {domain}/v1/page/media/{title}{/revision}{/tid}
 * Gets the media items associated with the given page.
 */
router.get('/media/:title/:revision?/:tid?', (req, res) => {
    return BBPromise.join(
        parsoid.getParsoidHtml(app, req),
        mwapi.getSiteInfo(app, req),
        (html, siteinfo) => {
            const revTid = parsoid.getRevAndTidFromEtag(html.headers);
            const pageMediaList = lib.getMediaItemInfoFromPage(html.body);
            if (!pageMediaList.length && !pageMediaList.length) {
                res.send({ items: [] });
                return;
            }
            return imageinfo.getMetadataFromApi(app, req,
                getDeduplicatedTitles(pageMediaList.filter(i => i.repository === 'commons')),
                getDeduplicatedTitles(pageMediaList.filter(i => i.repository === 'local')),
                siteinfo)
            .then((apiResponse) => {
                const result = lib.combineResponses(apiResponse, pageMediaList);
                mUtil.setETag(res, revTid.revision, revTid.tid);
                mUtil.setContentType(res, mUtil.CONTENT_TYPES.media);
                mUtil.setLanguageHeaders(res, html.headers);
                res.send({
                    revision: revTid.revision,
                    tid: revTid.tid,
                    items: result
                });
            });
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
