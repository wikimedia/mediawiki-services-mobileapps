/**
 * MediaWiki API helpers
 */

'use strict';

var preq = require('preq');
var sUtil = require('../lib/util');

// shortcut
var HTTPError = sUtil.HTTPError;

var DEFAULT_LEAD_IMAGE_WIDTH = 640;

/**
 * Checks if the query failed based on the response status code
 * @param response the response received from the API
 */
function checkResponseStatus(response) {
    if (response.status < 200 || response.status > 399) {
        // there was an error when calling the upstream service, propagate that
        throw new HTTPError({
            status: response.status,
            type: 'api_error',
            title: 'upstream service error',
            detail: response.body
        });
    }
}

function checkForMobileviewInResponse(logger, response) {
    if (!(response && response.body && response.body.mobileview)) {
        // we did not get our expected mobileview from the MW API, propagate that

        if (response.body.error && response.body.error.code) {
            if (response.body.error.code === "missingtitle") {
                throw new HTTPError({
                    status: 404,
                    type: 'missingtitle',
                    title: "The page you requested doesn't exist",
                    detail: response.body
                });
            }
            // TODO: add more error conditions here:
        }

        // fall-through to generic error message
        logger.log('warn/mwapi', 'no mobileview in response: ' + JSON.stringify(response.body, null, 2));
        throw new HTTPError({
            status: 504,
            type: 'api_error',
            title: 'no mobileview in response',
            detail: response.body
        });
    }
}

function checkForQueryPagesInResponse(logger, response) {
    if (!(response && response.body && response.body.query && response.body.query.pages)) {
        // we did not get our expected query.pages from the MW API, propagate that
        logger.log('error/mwapi', 'no query.pages in response');
        throw new HTTPError({
            status: response.status,
            type: 'api_error',
            title: 'no query.pages in response',
            detail: response.body
        });
    }
}

/**
 * A helper function that obtains the HTML from the MW API and
 * loads it into a domino DOM document instance.
 *
 * @param {String} domain the domain to contact
 * @param {Object} params an Object with all the query parameters for the MW API
 * @return {Promise} a promise resolving as the HTML element object
 */
function apiGet(domain, params) {
    // get the page from the MW API
    return preq.post({
        uri: 'https://' + domain + '/w/api.php',
        body: params
    }).then(function(response) {
        //console.log(JSON.stringify(response, null, 2));

        checkResponseStatus(response);
        return response;
    });
}

/**
 * Builds the request to get page metadata from MW API action=mobileview.
 *
 * @param logger
 * @param {String} domain the domain to contact
 * @param {String} title title of the requested page
 * @return {Promise} a promise resolving as an JSON object containing the response
 */
function getMetadata(logger, domain, title) {
    return apiGet(domain, {
        "action": "mobileview",
        "format": "json",
        "formatversion": 2,
        "page": title,
        "prop": "languagecount|thumb|image|id|revision|description|lastmodified|normalizedtitle|displaytitle|protection|editable",
        "thumbsize": DEFAULT_LEAD_IMAGE_WIDTH
    }).then(function (response) {
        checkForMobileviewInResponse(logger, response);
        return response;
    });
}

/**
 * Builds the request to get all sections from MW API action=mobileview.
 *
 * @param logger
 * @param {String} domain the domain to contact
 * @param {String} title title of the requested page
 * @return {Promise} a promise resolving as an JSON object containing the response
 */
function getAllSections(logger, domain, title) {
    return apiGet(domain, {
        "action": "mobileview",
        "format": "json",
        "formatversion": 2,
        "page": title,
        "prop": "text|sections|languagecount|thumb|image|id|revision|description|lastmodified|normalizedtitle|displaytitle|protection|editable",
        "sections": "all",
        "sectionprop": "toclevel|line|anchor",
        "noheadings": true,
        "thumbsize": DEFAULT_LEAD_IMAGE_WIDTH
    }).then(function (response) {
        checkForMobileviewInResponse(logger, response);
        return response;
    });
}

/**
 *
 * Requests an article extract.
 *
 * @param {String} domain the domain to contact
 * @param title title of the requested page extract
 * @return {Promise} a promise resolving as an JSON object containing the response
 */
function requestExtract(domain, title) {
    return apiGet(domain, {
        action: 'query',
        format: 'json',
        formatversion: '2',
        redirects: true,
        prop: 'extracts|pageimages',
        exsentences: 5, // see T59669 + T117082
        explaintext: true,
        piprop: 'thumbnail',
        pithumbsize: 320,
        titles: title
    });
}

/**
 * Builds an array of URLs for lead images with different sizes based on common bucket widths: 640, 800, 1024.
 * @param initialUrl the initial URL for an actual lead image (caller already checked for undefined)
 *        example URL: //upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cat_poster_1.jpg/640px-Cat_poster_1.jpg
 */
function buildLeadImageUrls(initialUrl) {
    return {
        640: initialUrl.replace(/\/\d+px-/, "/640px-"),
        800: initialUrl.replace(/\/\d+px-/, "/800px-"),
        1024: initialUrl.replace(/\/\d+px-/, "/1024px-")
    };
}

module.exports = {
    apiGet: apiGet,
    getMetadata: getMetadata,
    getAllSections: getAllSections,
    buildLeadImageUrls: buildLeadImageUrls,
    checkResponseStatus: checkResponseStatus,
    checkForQueryPagesInResponse: checkForQueryPagesInResponse,
    requestExtract: requestExtract
};
