'use strict';

const sUtil = require('../../lib/util');
const mUtil = require('../../lib/mobile-util');
const parsoid = require('../../lib/parsoid-access');

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
    return parsoid.pageHtmlPromise(app, req)
    .then((response) => {
        res.status(200);
        mUtil.setETag(res, response.meta.revision, response.meta.tid);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.metadata);
        res.json({});
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
