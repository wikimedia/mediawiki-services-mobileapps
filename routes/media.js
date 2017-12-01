'use strict';

const BBPromise = require('bluebird');
const domino = require('domino');
const mUtil = require('../lib/mobile-util');
const parsoid = require('../lib/parsoid-access');
const sUtil = require('../lib/util');
const mwapi = require('../lib/mwapi');
const media = require('../lib/media');

const router = sUtil.router();
let app;

/**
 * GET {domain}/v1/page/media/{title}{/revision}{/tid}
 * Gets the media items associated with the given page.
 */
router.get('/media/:title/:revision?/:tid?', (req, res) => {
    return BBPromise.props({
        html: parsoid.getParsoidHtml(app, req),
        siteinfo: mwapi.getSiteInfo(app, req)
    }).then((response) => {
        const revTid = parsoid.getRevAndTidFromEtag(response.html.headers);
        const doc = domino.createDocument(response.html.body);
        // todo: handle Mathoid-rendered math images
        const selection = doc.querySelectorAll(media.SELECTORS.join(','));
        if (!selection) {
            res.send({ items: [] });
            return;
        }
        const mediaList = media.getMediaItemInfoFromPage(selection);
        const titles = mUtil.deduplicate(mediaList.map(item => item.title));
        return media.getMetadataFromApi(app, req, titles, response.siteinfo).then((response) => {
            mUtil.mergeByProp(mediaList, response.items, 'title', false);
            mUtil.setETag(res, revTid.revision, revTid.tid);
            mUtil.setContentType(res, mUtil.CONTENT_TYPES.unpublished);
            res.send({ items: mediaList.filter(item => media.filterResult(item)) });
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
