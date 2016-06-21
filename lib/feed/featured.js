/**
 * To retrieve TFA -- Today's featured article -- for a given date.
 */

'use strict';

var preq = require('preq');
var api = require('../api-util');
var mwapi = require('../mwapi');
var dateUtil = require('../dateUtil');
var sUtil = require('../util');
var HTTPError = sUtil.HTTPError;


/**
 * Builds the request to get the Featured article of a given date.
 *
 * @param {Object} app the application object
 * @param {String} domain the requested domain, e.g. 'de.wikipedia.org'
 * @param {Date} date for which day the featured article is requested
 * @return {Promise} a promise resolving as an JSON object containing the response
 */
function requestFeaturedArticleTitle(app, domain, date) {
    var formattedDateString = dateUtil.formatDateEnglish(date);
    return api.mwApiGet(app, domain, {
        action: 'query',
        format: 'json',
        formatversion: 2,
        exchars: 255,
        explaintext: '',
        titles: `Template:TFA_title/${formattedDateString}`,
        prop: 'extracts'
    });
}

// -- functions dealing with responses:

function getPageObject(response, dontThrow) {
    if (response.body.query && response.body.query.pages[0]) {
        var page = response.body.query.pages[0];
        if (!page.extract || !page.pageid || page.missing === true) {
            throw new HTTPError({
                status: 404,
                type: 'not_found',
                title: 'No featured article for this date',
                detail: 'There is no featured article for this date.'
            });
        }
        return page;
    } else {
        if (!dontThrow) {
            throw new HTTPError({
                status: 500,
                type: 'unknown_backend_response',
                title: 'Unexpected backend response',
                detail: 'The backend responded with gibberish.'
            });
        }
    }
}

/**
 * HAX: TextExtracts extension will (sometimes) add "..." to the extract.  In this particular case, we don't
 * want it, so we remove it if present.
 */
function removeEllipsis(extract) {
    if (extract.endsWith('...')) {
        return extract.slice(0, -3);
    }
    return extract;
}

function promise(app, req) {
    if (req.params.domain.indexOf('en') !== 0) {
        throw new HTTPError({
            status: 501,
            type: 'unsupported_language',
            title: 'Language not supported',
            detail: 'The language you have requested is not yet supported.'
        });
    }

    var tfaPageObj, pageTitle;

    return requestFeaturedArticleTitle(app, req.params.domain, dateUtil.getRequestedDate(req))
    .then(function (response) {
        mwapi.checkForQueryPagesInResponse(req, response);
        tfaPageObj = getPageObject(response);
        pageTitle = removeEllipsis(tfaPageObj.extract);
        req.params.title = pageTitle;
        return mwapi.requestExtractAndDescription(app, req);
    }).then(function (extractResponse) {
        mwapi.checkForQueryPagesInResponse(req, extractResponse);
        var extractPageObj = getPageObject(extractResponse, true);
        return {
            payload: mwapi.buildSummaryResponse(extractPageObj),
            meta: {
                etag: tfaPageObj.pageid + '/' + mwapi.getRevisionFromExtract(extractPageObj)
            }
        };
    });
}

module.exports = {
    promise: promise
};
