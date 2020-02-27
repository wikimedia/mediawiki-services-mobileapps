'use strict';

const wikiLanguage = require('./wikiLanguage');
const MobileHTML = require('./mobile/MobileHTML');
const MobileViewHTML = require('./mobile/MobileViewHTML');
const domino = require('domino');
const BBPromise = require('bluebird');
const mwapi = require('./mwapi');
const uuid = require('cassandra-uuid').TimeUuid;
const Localizer = require('./mobile/Localizer');
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
    return {
        revision: res.body.mobileview.revision,
        tid: uuid.now().toString(),
        _headers: headers
    };
}

function buildPage(req, mobileviewResponse, mw, processingScript, options) {
    const mobileview = mobileviewResponse.body.mobileview;
    const metadata = getMeta(req, mobileviewResponse);
    metadata.mw = mw;
    metadata.baseURI = options.baseURI;
    metadata.domain = options.domain;
    const document = domino.createDocument('');
    MobileViewHTML.convertToParsoidDocument(document, mobileview, metadata);
    return BBPromise.props({
        doc: processing(document, processingScript, options),
        metadata
    });
}

function requestAndProcessPageIntoParsoid(req, scripts, baseURI) {
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

function requestAndProcessPageIntoMobileHTML(req, scripts, baseURI, outputMode) {
    return BBPromise.props({
        result: requestAndProcessPageIntoParsoid(req, scripts, baseURI),
        localizer: Localizer.promise(req)
    }).then(props => {
        const metadata = props.result.metadata;
        metadata.baseURI = baseURI;
        return MobileHTML.promise(props.result.doc, metadata, outputMode, props.localizer)
            .then(mobileHTML => {
                mobileHTML.addMediaWikiMetadata(metadata.mw);
                return mobileHTML;
            });
    });
}

module.exports = {
    requestAndProcessPageIntoParsoid,
    requestAndProcessPageIntoMobileHTML,
    shouldUseMobileview
};
