'use strict';

const BBPromise = require('bluebird');
const domino = require('domino');
const mUtil = require('../lib/mobile-util');
const parsoid = require('../lib/parsoid-access');
const sUtil = require('../lib/util');
const mwapi = require('../lib/mwapi');
const media = require('../lib/media');
const Title = require('mediawiki-title').Title;

const router = sUtil.router();
let app;

/**
 * GET {domain}/v1/page/media/{title}
 * Gets the media items associated with the given page.
 */
router.get('/media/:title', (req, res) => {
    return parsoid.getParsoidHtml(app, req).then((response) => {
        const headers = response.headers;
        const doc = domino.createDocument(response.body);
        // todo: handle Mathoid-rendered math images
        const selection = doc.querySelectorAll('*[typeof^=mw:Image] img,*[typeof^=mw:Video] video');
        if (!selection) {
            res.send({ items: [] });
            return;
        }
        const mediaList = media.getMediaItemInfoFromPage(selection);
        const titles = mediaList.map(item => item.title);
        return BBPromise.props({
            metadata: media.getMetadataFromApi(app, req, titles),
            siteinfo: mwapi.getSiteInfo(app, req)
        }).then((response) => {
            const revTid = parsoid.getRevAndTidFromEtag(headers);
            const metadataList = response.metadata.items;
            metadataList.forEach((item) => {
                item.title = Title.newFromText(item.title, response.siteinfo).getPrefixedDBKey();
            });
            mUtil.mergeByProp(mediaList, metadataList, 'title', false);
            const result = mediaList.filter((item) => {
                return media.filterResult(item);
            });
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
