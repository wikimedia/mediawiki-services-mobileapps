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
    return parsoid.getParsoidHtml(app, req).then((response) => {
        const titles = media.getTitles(response.body);
        if (!titles) {
            res.send({ items: [] });
            return;
        }
        return BBPromise.props({
            titles,
            metadata: media.getMetadata(app, req, titles),
            headers: response.headers,
            siteinfo: mwapi.getSiteInfo(app, req)
        }).then((response) => {
            const revTid = parsoid.getRevAndTidFromEtag(response.headers);
            const metadataList = response.metadata.items;
            const result = metadataList.filter((item) => {
                return media.filterResult(item);
            });
            if (result) {
                media.sort(response.titles, result, response.siteinfo);
            }
            mUtil.setETag(res, revTid.revision, revTid.tid);
            mUtil.setContentType(res, mUtil.CONTENT_TYPES.unpublished);
            res.send({ items: result });
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
