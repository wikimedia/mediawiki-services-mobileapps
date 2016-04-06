/**
 * MediaWiki API helpers
 */

'use strict';

var preq = require('preq');
var sUtil = require('../lib/util');
var Template = require('swagger-router').Template;

var HTTPError = sUtil.HTTPError;

var DEFAULT_LEAD_IMAGE_WIDTH = 1024;
var WIDTH_IN_IMAGE_URL_REGEX = /\/(\d+)px-/;

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

function checkForQueryPagesInResponse(req, response) {
    if (!(response && response.body && response.body.query && response.body.query.pages)) {
        // we did not get our expected query.pages from the MW API, propagate that
        req.logger.log('error/mwapi', 'no query.pages in response');
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
 * @param {Object} app the application object
 * @param {Object} req the request object
 * @param {Object} params: an object with all the query parameters for the MW API
 * @return {Promise} a promise resolving as the HTML element object
 */
function apiGet(app, req, params) {
    var request = new Template(app.conf.mwapi_req).expand({
        request: req
    });
    request.body = params;

    return preq(request).then(function(response) {
        checkResponseStatus(response);
        return response;
    });
}

/**
 * Builds the request to get page metadata from MW API action=mobileview.
 *
 * @param {Object} app the application object
 * @param {Object} req the request object
 * @return {Promise} a promise resolving as an JSON object containing the response
 */
function getMetadata(app, req) {
    return apiGet(app, req, {
        "action": "mobileview",
        "format": "json",
        "formatversion": 2,
        "page": req.params.title,
        "prop": "languagecount|thumb|image|id|revision|description|lastmodified|normalizedtitle|displaytitle|protection|editable",
        "thumbsize": DEFAULT_LEAD_IMAGE_WIDTH
    }).then(function (response) {
        checkForMobileviewInResponse(req.logger, response);
        return response;
    });
}

/**
 * Builds the request to get all sections from MW API action=mobileview.
 *
 * @param {Object} app the application object
 * @param {Object} req the request object
 * @return {Promise} a promise resolving as an JSON object containing the response
 */
function getAllSections(app, req) {
    return apiGet(app, req, {
        "action": "mobileview",
        "format": "json",
        "formatversion": 2,
        "page": req.params.title,
        "prop": "text|sections|languagecount|thumb|image|id|revision|description|lastmodified|normalizedtitle|displaytitle|protection|editable",
        "sections": "all",
        "sectionprop": "toclevel|line|anchor",
        "noheadings": true,
        "thumbsize": DEFAULT_LEAD_IMAGE_WIDTH
    }).then(function (response) {
        checkForMobileviewInResponse(req.logger, response);
        return response;
    });
}

/**
 *
 * Requests an article extract.
 *
 * @param {Object} app the application object
 * @param {Object} req the request object
 * @return {Promise} a promise resolving as an JSON object containing the response
 */
function requestExtract(app, req) {
    return apiGet(app, req, {
        action: 'query',
        format: 'json',
        formatversion: '2',
        redirects: true,
        prop: 'extracts|pageimages',
        exsentences: 5, // see T59669 + T117082
        explaintext: true,
        piprop: 'thumbnail',
        pithumbsize: 320,
        titles: req.params.title
    });
}

function scaledImageUrl(initialUrl, initialWidth, desiredWidth) {
    if (initialWidth > desiredWidth) {
        return initialUrl.replace(WIDTH_IN_IMAGE_URL_REGEX, "/" + desiredWidth + "px-");
    } else {
        return initialUrl;
    }
}

/**
 * Builds an array of URLs for lead images with different sizes based on common bucket widths: 320, 640, 800, 1024.
 * @param initialUrl the initial URL for an actual lead image (caller already checked for undefined)
 *        example URL: //upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cat_poster_1.jpg/640px-Cat_poster_1.jpg
 */
function buildLeadImageUrls(initialUrl) {
    var match = WIDTH_IN_IMAGE_URL_REGEX.exec(initialUrl);
    if (match) {
        var initialWidth = match[1];
        if (initialWidth > 320) {
            return {
                320: scaledImageUrl(initialUrl, initialWidth, 320),
                640: scaledImageUrl(initialUrl, initialWidth, 640),
                800: scaledImageUrl(initialUrl, initialWidth, 800),
                1024: scaledImageUrl(initialUrl, initialWidth, 1024)
            };
        }
    }

    // can't get a bigger image size than smallest request size of 320 or don't know the original size.
    return {
        320: initialUrl,
        640: initialUrl,
        800: initialUrl,
        1024: initialUrl
    };
}

module.exports = {
    apiGet: apiGet,
    getMetadata: getMetadata,
    getAllSections: getAllSections,
    buildLeadImageUrls: buildLeadImageUrls,
    checkResponseStatus: checkResponseStatus,
    checkForQueryPagesInResponse: checkForQueryPagesInResponse,
    requestExtract: requestExtract,

    // VisibleForTesting
    _buildLeadImageUrls: buildLeadImageUrls
};
