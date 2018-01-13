'use strict';

const BBPromise = require('bluebird');
const mwapi = require('../lib/mwapi');
const mUtil = require('../lib/mobile-util');
const parsoid = require('../lib/parsoid-access');
const sUtil = require('../lib/util');
const Title = require('mediawiki-title').Title;

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET {domain}/v1/page/summary/{title}/{revision?}/{tid?}
 * Extracts a summary of a given wiki page limited to one paragraph of text
 */
router.get('/summary/:title/:revision?/:tid?', (req, res) => {
    return BBPromise.props({
        page: parsoid.pageJsonPromise(app, req, false),
        meta: mwapi.getMetadata(app, req),
        title: mwapi.getTitleObj(app, req),
        siteinfo: mwapi.getSiteInfo(app, req)
    }).then((response) => {
        const title = Title.newFromText(req.params.title, response.siteinfo);
        const summary = mUtil.buildSummary(req.params.domain, title, response.page, response.meta);
        res.status(summary.code);
        if (summary.code === 200) {
            delete summary.code;
            mUtil.setETag(res, summary.revision, summary.tid);
            mUtil.setContentType(res, mUtil.CONTENT_TYPES.summary);
            res.send(summary);
        }
        res.end();
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
