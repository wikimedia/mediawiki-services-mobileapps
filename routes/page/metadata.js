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
    return BBPromise.props({
        html: parsoid.getParsoidHtml(app, req),
        meta: mwapi.getMetadata(app, req),
        siteinfo: mwapi.getSiteInfo(app, req)
    }).then((response) => {
        res.status(200);
        const revTid = parsoid.getRevAndTidFromEtag(response.html.headers);
        mUtil.setETag(res, revTid.revision, revTid.tid);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.metadata);
        res.json(lib.buildMetadata(req, response.html, response.meta, response.siteinfo));
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
