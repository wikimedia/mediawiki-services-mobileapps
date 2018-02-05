'use strict';

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
 * GET {domain}/v1/page/read-base-html/{title}{/revision}{/tid}
 * Gets page content in HTML. This is based on Parsoid with some minor modifications more
 * suitable for the reading use cases.
 */
router.get('/read-base-html/:title/:revision?/:tid?', (req, res) => {
    return parsoid.pageHtmlPromise(app, req, false)
    .then((response) => {
        res.status(200);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.readHtml, 'text/html');
        mUtil.setETag(res, response.meta.revision);
        res.send(response.html).end();
    });
});

/**
 * GET {domain}/v1/page/read-html/{title}{/revision}{/tid}
 * Gets page content in HTML. This is a more optimized for direct consumption by reading
 * clients.
 */
router.get('/read-html/:title/:revision?/:tid?', (req, res) => {
    return parsoid.pageHtmlPromise(app, req, true)
    .then((response) => {
        res.status(200);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.readHtml, 'text/html');
        mUtil.setETag(res, response.meta.revision);
        res.send(response.html).end();
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
