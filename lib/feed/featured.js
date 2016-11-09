/**
 * To retrieve TFA -- Today's featured article -- for a given date.
 */

'use strict';

var preq = require('preq');
var mUtil = require('../mobile-util');
var api = require('../api-util');
var mwapi = require('../mwapi');
var dateUtil = require('../dateUtil');
var sUtil = require('../util');
var BBPromise = require('bluebird');
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
    var tfaPageObj;
    var pageTitle;
    var domain = req.params.domain;
    var aggregated = !!req.query.aggregated;

    if (!dateUtil.validate(dateUtil.hyphenDelimitedDateString(req))) {
        if (aggregated) {
            return BBPromise.resolve({});
        }
        dateUtil.throwDateError();
    }

    if (domain.indexOf('en') !== 0 || domain.indexOf('beta.wmflabs.org') > 0) {
        if (aggregated) {
            return BBPromise.resolve({});
        } else {
            throw new HTTPError({
                status: 501,
                type: 'unsupported_language',
                title: 'Language not supported',
                detail: 'The language you have requested is not yet supported.'
            });
        }
    }

    return requestFeaturedArticleTitle(app, domain, dateUtil.getRequestedDate(req))
    .then(function (response) {
        mwapi.checkForQueryPagesInResponse(req, response);
        tfaPageObj = getPageObject(response);
        pageTitle = removeEllipsis(tfaPageObj.extract);
        return BBPromise.props({
            dbTitle: mwapi.getDbTitle(app, req, pageTitle)
        });
    }).then(function (res) {
        return {
            payload: { $merge: [ mUtil.getRbPageSummaryUrl(app.restbase_tpl, domain, res.dbTitle) ] },
            meta: { etag: tfaPageObj.pageid }
        };
    }).catch(function (err) {
        if (aggregated) {
            return BBPromise.resolve({});
        }
        throw err;
    });
}

module.exports = {
    promise: promise
};
