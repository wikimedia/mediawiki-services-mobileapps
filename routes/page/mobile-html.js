'use strict';

const mUtil = require('../../lib/mobile-util');
const parsoid = require('../../lib/parsoid-access');
const sUtil = require('../../lib/util');

/**
 * script-src:
 *   The pagelib JavaScript bundle is served on meta.wikimedia.org.
 *   We also add a small piece of inline JS to the end of the body to trigger lazy-loading.
 * style-src:
 *   The site CSS bundle is served from the current domain (TODO: currently assumes WP).
 *   The base CSS bundle is served on meta.wikimedia.org.
 *   The pages also have some inline styles.
 * img-src:
 *   We need to specifically allow data: URIs for the buttons from the wikimedia-page-library.
 */
const HTML_CSP = `default-src 'none'; media-src *; img-src * data:; script-src https://meta.wikimedia.org 'unsafe-inline'; style-src https://meta.wikimedia.org https://*.wikipedia.org 'self' 'unsafe-inline'; frame-ancestors 'self'`;

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET {domain}/v1/page/mobile-compat-html/{title}{/revision}{/tid}
 * Gets in HTML. This is based on Parsoid with some minor modifications more
 * suitable for the reading use cases.
 */
router.get('/mobile-compat-html/:title/:revision?/:tid?', (req, res) => {
    return parsoid.pageHtmlPromise(app, req, false)
    .then((response) => {
        res.status(200);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.mobileHtml);
        mUtil.setETag(res, response.meta.revision);
        mUtil.setLanguageHeaders(res, response.meta._headers);
        mUtil.setContentSecurityPolicy(res, HTML_CSP);
        // Don't poison the client response with the internal _headers object
        delete response.meta._headers;
        res.send(response.html).end();
    });
});

/**
 * GET {domain}/v1/page/mobile-html/{title}{/revision}{/tid}
 * Gets page content in HTML. This is a more optimized for direct consumption by reading
 * clients.
 */
router.get('/mobile-html/:title/:revision?/:tid?', (req, res) => {
    return parsoid.pageHtmlPromise(app, req, true)
    .then((response) => {
        res.status(200);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.mobileHtml);
        mUtil.setETag(res, response.meta.revision);
        mUtil.setLanguageHeaders(res, response.meta._headers);
        mUtil.setContentSecurityPolicy(res, HTML_CSP);
        // Don't poison the client response with the internal _headers object
        delete response.meta._headers;
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
