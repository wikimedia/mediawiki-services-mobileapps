/**
 * MediaWiki API helpers
 */

'use strict';

var preq = require('preq');
var sUtil = require('./util');
var api = require('./api-util');
var HTTPError = sUtil.HTTPError;

var DEFAULT_LEAD_IMAGE_WIDTH = 1024;
var WIDTH_IN_IMAGE_URL_REGEX = /\/(\d+)px-/;


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
 * Builds the request to get page metadata from MW API action=mobileview.
 *
 * @param {Object} app the application object
 * @param {Object} req the request object
 * @return {Promise} a promise resolving as an JSON object containing the response
 */
function getMetadata(app, req) {
    var query = {
        action: 'mobileview',
        format: 'json',
        formatversion: 2,
        page: req.params.title,
        prop: 'languagecount|thumb|image|id|revision|description|lastmodified|normalizedtitle|displaytitle|protection|editable',
        thumbsize: DEFAULT_LEAD_IMAGE_WIDTH
    };
    return api.mwApiGet(app, req.params.domain, query)
    .then(function (response) {
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
    var query = {
        action: 'mobileview',
        format: 'json',
        formatversion: 2,
        page: req.params.title,
        prop: 'text|sections|languagecount|thumb|image|id|revision|description|lastmodified|normalizedtitle|displaytitle|protection|editable',
        sections: 'all',
        sectionprop: 'toclevel|line|anchor',
        noheadings: true,
        thumbsize: DEFAULT_LEAD_IMAGE_WIDTH
    };
    return api.mwApiGet(app, req.params.domain, query)
    .then(function (response) {
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
    var query = {
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
    };
    return api.mwApiGet(app, req.params.domain, query);
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
    getMetadata: getMetadata,
    getAllSections: getAllSections,
    buildLeadImageUrls: buildLeadImageUrls,
    checkForQueryPagesInResponse: checkForQueryPagesInResponse,
    requestExtract: requestExtract,

    // VisibleForTesting
    _buildLeadImageUrls: buildLeadImageUrls
};
