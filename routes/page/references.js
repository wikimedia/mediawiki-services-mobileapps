'use strict';

const mwapi = require('../../lib/mwapi');
const mUtil = require('../../lib/mobile-util');
const parsoid = require('../../lib/parsoid-access');
const sUtil = require('../../lib/util');
const transforms = require('../../lib/transforms');
const mobileviewHtml = require('../../lib/mobileview-html');
const processMobileviewHtmlReferences = mobileviewHtml.buildPage;
const shouldUseMobileview = mobileviewHtml.shouldUseMobileview;

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * Build a response which contains a structure of reference sections
 * @param {!Object} meta metadata from Parsoid ETag header with revision and tid
 * @param {!Document} document the page content DOM Document (for the other properties)
 * @param {!Logger} logger a Bunyan logger
 * @return { reference_lists, references_by_id } an Object containing structured data of references
 */
function buildReferences(meta, document, logger) {
    return Object.assign(meta, transforms.extractReferenceLists(document, logger));
}

function commonEnd(res, result, req) {
    res.status(200);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.references);
    mUtil.setETag(res, result.meta.revision);
    mUtil.setLanguageHeaders(res, result.meta._headers);
    // Don't poison the client response with the internal _headers object
    delete result.meta._headers;
    res.json(buildReferences(result.meta, result.doc, req.logger)).end();
}

function getReferencesFromParsoid(req, res) {
    return parsoid.pageHtmlPromiseForReferences(app, req)
    .then((result) => {
        commonEnd(res, result, req);
    });
}

function getReferencesFromMobileview(req, res) {
    return mwapi.getPageFromMobileview(app, req)
    .then((mwResponse) => {
        return processMobileviewHtmlReferences(mwResponse,
            app.conf.processing_scripts.references, {
                baseURI: app.conf.mobile_html_rest_api_base_uri,
                domain: req.params.domain,
                mobileview: mwResponse.body.mobileview
            }
        );
    }).then((result) => {
        commonEnd(res, result, req);
    });
}

/**
 * GET {domain}/v1/page/references/{title}{/revision}{/tid}
 * Gets any sections which are part of a reference sections for a given wiki page.
 */
router.get('/references/:title/:revision?/:tid?', (req, res) => {
    if (!shouldUseMobileview(req)) {
        return getReferencesFromParsoid(req, res);
    } else {
        return getReferencesFromMobileview(req, res);
    }

});

module.exports = function(appObj) {
    app = appObj;
    return {
        path: '/page',
        api_version: 1,
        router
    };
};
