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
 * GET {domain}/v1/page/media-list/{title}{/revision}{/tid}
 * Returns the non-UI media files used on the given page.
 */
router.get('/media-list/:title/:revision?/:tid?', (req, res) => {
    return parsoid.getParsoidHtml(req).then(parsoidRsp => {
        return mUtil.createDocument(parsoidRsp.body).then(doc => {
            return lib.resolveTitleRedirects(req, lib.getMediaItemInfoFromDoc(doc))
                .then(pageMediaList => {
                    const revTid = parsoid.getRevAndTidFromEtag(parsoidRsp.headers);
                    mUtil.setETag(res, revTid.revision, revTid.tid);
                    mUtil.setContentType(res, mUtil.CONTENT_TYPES.mediaList);
                    mUtil.setLanguageHeaders(res, parsoidRsp.headers);
                    res.send({
                        revision: revTid.revision,
                        tid: revTid.tid,
                        items: pageMediaList
                });
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
