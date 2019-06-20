'use strict';

const lib = require('../../lib/summary');
const BBPromise = require('bluebird');
const mwapi = require('../../lib/mwapi');
const mUtil = require('../../lib/mobile-util');
const parsoid = require('../../lib/parsoid-access');
const sUtil = require('../../lib/util');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET {domain}/v1/page/summary/{title}{/revision?}{/tid?}
 * Extracts a summary of a given wiki page limited to one paragraph of text
 */
router.get('/summary/:title/:revision?/:tid?', (req, res) => {
    return BBPromise.join(
        parsoid.getParsoidHtml(req),
        mwapi.getMetadataForSummary(req, mwapi.LEAD_IMAGE_S),
        mwapi.getSiteInfo(req),
        (html, meta, siteinfo) => {
            const revTid = parsoid.getRevAndTidFromEtag(html.headers);
            return lib.buildSummary(req.params.domain, req.params.title,
                html.body, revTid, meta, siteinfo, app.conf.processing_scripts.summary)
            .then((summary) => {
                res.status(summary.code);
                if (summary.code === 200) {
                    delete summary.code;
                    mUtil.setETag(res, revTid.revision, revTid.tid);
                    mUtil.setContentType(res, mUtil.CONTENT_TYPES.summary);
                    mUtil.setLanguageHeaders(res, html.headers);
                    res.send(summary);
                }
                res.end();
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
