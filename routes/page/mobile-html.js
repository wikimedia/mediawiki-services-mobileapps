'use strict';

const BBPromise = require('bluebird');
const domUtil = require('../../lib/domUtil');
const mwapi = require('../../lib/mwapi');
const mUtil = require('../../lib/mobile-util');
const parsoidApi = require('../../lib/parsoid-access');
const preprocessParsoidHtml = require('../../lib/processing');
const sUtil = require('../../lib/util');
const transforms = require('../../lib/transforms');

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
const HTML_CSP = "default-src 'none'; media-src *; img-src * data:; script-src app://meta.wikimedia.org https://meta.wikimedia.org 'unsafe-inline'; style-src app://meta.wikimedia.org https://meta.wikimedia.org app://*.wikipedia.org https://*.wikipedia.org 'self' 'unsafe-inline'; frame-ancestors 'self'";

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
    return parsoidApi.pageDocumentPromise(app, req, false)
    .then((response) => {
        res.status(200);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.mobileHtml);
        mUtil.setETag(res, response.meta.revision);
        mUtil.setLanguageHeaders(res, response.meta._headers);
        mUtil.setContentSecurityPolicy(res, HTML_CSP);
        // Don't poison the client response with the internal _headers object
        delete response.meta._headers;
        res.send(response.document.outerHTML).end();
    });
});

/**
 * GET {domain}/v1/page/mobile-html/{title}{/revision}{/tid}
 * Gets page content in HTML. This is a more optimized for direct consumption by reading
 * clients.
 */
router.get('/mobile-html/:title/:revision?/:tid?', (req, res) => {
    return BBPromise.props({
        parsoid: parsoidApi.pageDocumentPromise(app, req, true),
        mw: mwapi.getMetadataForMobileHtml(app, req)
    }).then((response) => {
        return BBPromise.props({
            // run another processing script after we've retrieved the metadata response from MW API
            processedParsoidResponse: preprocessParsoidHtml(response.parsoid.document,
                app.conf.processing_scripts['mobile-html-post-meta'],
                { mw: response.mw, parsoid: response.parsoid }),
            parsoid: BBPromise.resolve(response.parsoid),
            mw: BBPromise.resolve(response.mw)
        });
    }).then((response) => {
        res.status(200);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.mobileHtml);
        mUtil.setETag(res, response.parsoid.meta.revision);
        mUtil.setLanguageHeaders(res, response.parsoid.meta._headers);
        mUtil.setContentSecurityPolicy(res, HTML_CSP);
        // Don't poison the client response with the internal _headers object
        delete response.parsoid.meta._headers;

        res.send(response.processedParsoidResponse.outerHTML).end();
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
