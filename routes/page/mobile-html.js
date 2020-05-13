'use strict';

const BBPromise = require('bluebird');
const mwapi = require('../../lib/mwapi');
const mUtil = require('../../lib/mobile-util');
const mRequestUtil = require('../../lib/mobile/mobile-request-util');
const mobileviewHtml = require('../../lib/mobileview-html');
const apiUtilConstants = require('../../lib/api-util-constants');
const parsoidApi = require('../../lib/parsoid-access');
const sUtil = require('../../lib/util');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

function getMobileHtmlFromPOST(req, res) {
    const html = req.body && req.body.html || req.body;
    const outputHeader = req.header('output-mode');
    const outputMode = mRequestUtil.getOutputMode(outputHeader);
    const mobileHtmlPromise = parsoidApi.mobileHTMLPromiseFromHTML(app, req, res, html, outputMode);
    return BBPromise.props({
        mobileHTML: mobileHtmlPromise,
        mw: mwapi.getMetadataForMobileHtml(req)
    }).then((response) => {
        response.mobileHTML.addMediaWikiMetadata(response.mw);
        return response.mobileHTML;
    }).then((mobileHTML) => {
        res.status(200);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.mobileHtml);
        mUtil.setLanguageHeaders(res, mobileHTML.metadata._headers);
        mUtil.setContentSecurityPolicy(res, app.conf.mobile_html_csp);
        res.send(mobileHTML.doc.outerHTML).end();
        if (mobileHTML.processingTime) {
            app.metrics.timing('transform_html_to_mobile-html.processing', mobileHTML.processingTime);
        }
    });
}

function getMobileHtmlFromParsoid(req, res) {
    return BBPromise.props({
        mobileHTML: parsoidApi.mobileHTMLPromise(app, req),
        mw: mwapi.getMetadataForMobileHtml(req)
    }).then((response) => {
        response.mobileHTML.addMediaWikiMetadata(response.mw);
        return response.mobileHTML;
    }).then((mobileHTML) => {
        res.status(200);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.mobileHtml);
        mUtil.setETag(res, mobileHTML.metadata.revision);
        mUtil.setLanguageHeaders(res, mobileHTML.metadata._headers);
        mUtil.setContentSecurityPolicy(res, app.conf.mobile_html_csp);
        res.send(mobileHTML.doc.outerHTML).end();
        if (mobileHTML.processingTime) {
            app.metrics.timing('page_mobile-html.processing', mobileHTML.processingTime);
        }
    });
}

function getMobileHtmlFromMobileview(req, res) {
    const scripts = [];
    const baseURI = mUtil.getMetaWikiRESTBaseAPIURI(app, req);
    return mobileviewHtml.requestAndProcessPageIntoMobileHTML(req, scripts, baseURI)
    .then((mobileHTML) => {
        res.status(200);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.mobileHtml);
        mUtil.setETag(res, mobileHTML.metadata.revision);
        mUtil.setLanguageHeaders(res, mobileHTML.metadata._headers);
        mUtil.setContentSecurityPolicy(res, app.conf.mobile_html_csp);
        res.send(mobileHTML.doc.outerHTML).end();
        if (mobileHTML.processingTime) {
            app.metrics.timing('page_mobile-html.mobileview_processing', mobileHTML.processingTime);
        }
    });
}

/**
 * GET {domain}/v1/page/mobile-html/{title}{/revision}{/tid}
 * Gets page content in HTML. This is a more optimized for direct consumption by reading
 * clients.
 */
router.get('/page/mobile-html/:title/:revision?/:tid?', (req, res) => {
    if (!mobileviewHtml.shouldUseMobileview(req)) {
        return getMobileHtmlFromParsoid(req, res);
    } else {
        return getMobileHtmlFromMobileview(req, res);
    }
});

/**
 * POST {domain}/v1/transform/html/to/mobile-html/{title}
 * Previews page content in HTML. POST body should be Parsoid HTML
 */
router.post('/transform/html/to/mobile-html/:title', (req, res) => {
    return getMobileHtmlFromPOST(req, res);
});

router.get('/page/mobile-html-offline-resources/:title/:revision?/:tid?', (req, res) => {
    res.status(200);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.mobileHtmlOfflineResources);
    mUtil.setContentSecurityPolicy(res, app.conf.mobile_html_csp);

    // Get external API URI
    const externalApiUri = apiUtilConstants.getExternalRestApiUri(req.params.domain);
    const metawikiApiUri = mUtil.getMetaWikiRESTBaseAPIURI(app, req);
    const localApiUri = mUtil.getLocalRESTBaseAPIURI(app, req);

    const offlineResources = [
        `${metawikiApiUri}data/css/mobile/base`,
        `${metawikiApiUri}data/css/mobile/pcs`,
        `${metawikiApiUri}data/javascript/mobile/pcs`,
        `${externalApiUri}data/css/mobile/site`,
        `${localApiUri}data/i18n/pcs`
    ];

    res.send(offlineResources).end();
});

module.exports = function(appObj) {
    app = appObj;
    return {
        path: '/',
        api_version: 1,
        router
    };
};
