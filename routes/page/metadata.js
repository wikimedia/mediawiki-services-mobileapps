'use strict';

const BBPromise = require('bluebird');
const sUtil = require('../../lib/util');
const mUtil = require('../../lib/mobile-util');
const parsoid = require('../../lib/parsoid-access');
const mwapi = require('../../lib/mwapi');
const lib = require('../../lib/metadata');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET {domain}/v1/page/metadata/{title}{/revision}{/tid}
 * Gets extended metadata for a given wiki page.
 */
router.get('/metadata/:title/:revision?/:tid?', (req, res) => {
    return BBPromise.join(
        parsoid.getParsoidHtml(req),
        mwapi.getMetadataForMetadata(req),
        mwapi.getSiteInfo(req),
        (html, meta, siteinfo) => {
            const revTid = parsoid.getRevAndTidFromEtag(html.headers);
            return lib.buildMetadata(req, html, meta, siteinfo,
                app.conf.processing_scripts.metadata)
            .then((metadata) => {
                res.status(200);
                mUtil.setETag(res, revTid.revision, revTid.tid);
                mUtil.setContentType(res, mUtil.CONTENT_TYPES.metadata);
                mUtil.setLanguageHeaders(res, html.headers);
                res.json(metadata);
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
