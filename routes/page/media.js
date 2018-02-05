'use strict';

const BBPromise = require('bluebird');
const mUtil = require('../../lib/mobile-util');
const parsoid = require('../../lib/parsoid-access');
const sUtil = require('../../lib/util');
const mwapi = require('../../lib/mwapi');
const media = require('../../lib/media');

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
        const mediaList = media.getMediaItemInfoFromPage(response.html.body);
        if (!mediaList.length) {
            res.send({ items: [] });
            return;
        }
        const titles = mUtil.deduplicate(mediaList.map(item => item.title));
        return media.getMetadataFromApi(app, req, titles, response.siteinfo).then((response) => {
            response.items.forEach((metadataItem) => {
                mediaList.forEach((mediaItem) => {
                    if (mediaItem.title === metadataItem.titles.canonical) {
                        Object.assign(mediaItem, metadataItem);
                        delete mediaItem.title;

                        // delete 'original' property for videos
                        if (mediaItem.sources) {
                            delete mediaItem.original;
                        }
                    }
                });
            });
            mUtil.setETag(res, revTid.revision, revTid.tid);
            mUtil.setContentType(res, mUtil.CONTENT_TYPES.media);
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
