'use strict';

const wikiLanguage = require('./wikiLanguage');
const MobileHTML = require('./mobile/MobileHTML');
const MobileViewHTML = require('./mobile/MobileViewHTML');
const addPageHeader = require('./transformations/pcs/addPageHeader');
const addMetaTags = require('./transforms').addMetaTags;
const domino = require('domino');
const BBPromise = require('bluebird');
const mwapi = require('./mwapi');
const uuid = require('cassandra-uuid').TimeUuid;

const processing = require('./processing');

function shouldUseMobileview(req) {
    return wikiLanguage.getLanguageCode(req.params.domain) === 'zh';
}

function getMeta(req, res) {
    const languageCode = wikiLanguage.getLanguageCode(req.params.domain);
    const isLanguageCodeWithVariants = wikiLanguage.isLanguageCodeWithVariants(languageCode);
    let headers;
    if (isLanguageCodeWithVariants) {
        headers = {
            'Content-Language': languageCode,
            Vary: 'Accept-Language'
        };
    }
    return BBPromise.resolve({
        revision: res.body.mobileview.revision,
        tid: uuid.now().toString(),
        _headers: headers
    });
}

function buildPage(req, mwResponse, meta, processingScript, options) {
    const mobileview = mwResponse.body.mobileview;
    const metaObj = { mw: meta };
    options.meta = meta;
    const document = domino.createDocument('');
    MobileViewHTML.convertToParsoidDocument(document, mobileview, options);
    return BBPromise.props({
        doc: MobileHTML.promise(document, options).then(mobileHTML => {
            return processing(mobileHTML.doc, processingScript, options);
          }),
        meta: getMeta(req, mwResponse)
    }).then(result => {
        // addMetaTags and addPageHeader are usually called from a processing script,
        // but since we already have the MW API response here that's not necessary anymore.
        // Assumption: empty parsoid.meta ==> no pronunciation support
        addMetaTags(result.doc, metaObj);
        addPageHeader(result.doc, metaObj);
        return result;
    });
}

function requestAndProcessPage(req, scripts, baseURI) {
    return BBPromise.props({
        mobileview: mwapi.getPageFromMobileview(req),
        mw: mwapi.getMetadataForMobileHtml(req)
    }).then((response) => {
        return buildPage(req, response.mobileview, response.mw, scripts,
            {
                baseURI: baseURI,
                domain: req.params.domain,
                mobileview: response.mobileview.body.mobileview
            }
        );
    });
}

module.exports = {
    requestAndProcessPage,
    shouldUseMobileview
};
