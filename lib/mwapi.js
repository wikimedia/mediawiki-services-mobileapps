/**
 * MediaWiki API helpers
 */

'use strict';

var preq = require('preq');
var sUtil = require('./util');
var api = require('./api-util');
var HTTPError = sUtil.HTTPError;

var API_QUERY_MAX_TITLES = 50;
var DEFAULT_LEAD_IMAGE_WIDTH = 1024;
var DEFAULT_THUMB_WIDTH = 320;
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
        pithumbsize: DEFAULT_THUMB_WIDTH,
        titles: req.params.title
    };
    return api.mwApiGet(app, req.params.domain, query);
}

/**
 * Requests an article extract and its description.
 *
 * @param {Object} app the application object
 * @param {Object} req the request object
 * @return {Promise} a promise resolving as an JSON object containing the response
 */
function requestExtractAndDescription(app, req) {
    var query = {
        action: 'query',
        format: 'json',
        formatversion: '2',
        redirects: true,
        prop: 'extracts|pageimages|pageterms|revisions',
        exsentences: 5, // see T59669 + T117082
        explaintext: true,
        piprop: 'thumbnail',
        pithumbsize: 320,
        wbptterms: 'description',
        titles: req.params.title
      };
      return api.mwApiGet(app, req.params.domain, query);
}

function requestMostReadMetadata(app, req, titlesList) {
    var query = {
        action: 'query',
        format: 'json',
        formatversion: 2,
        prop: 'revisions|pageimages|pageterms',
        rvprop: 'ids',
        piprop: 'thumbnail',
        pilimit: API_QUERY_MAX_TITLES,
        pithumbsize: DEFAULT_THUMB_WIDTH,
        wbptterms: 'description',
        meta: 'siteinfo',
        siprop: 'general',
        titles: titlesList
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
 * Builds a set of URLs for different sizes of an image based on the provided array of widths.
 * @param {string}   initialUrl the initial URL for an image (caller already checked for undefined)
 *   example URL: //upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cat_poster_1.jpg/640px-Cat_poster_1.jpg
 * @param {number[]} widths     an array of desired widths for which to construct URLs
 */
function buildImageUrlSet(initialUrl, widths) {
    var match = WIDTH_IN_IMAGE_URL_REGEX.exec(initialUrl), result = {};
    widths.sort(function(a, b) {
        return a - b;
    });
    if (match) {
        var initialWidth = match[1];
        if (initialWidth > widths[0]) {
            for (let i in widths) {
                result[widths[i]] = scaledImageUrl(initialUrl, initialWidth, widths[i]);
            }
            return result;
        }
    }

    // can't get a bigger image size than smallest request size of 320 or don't know the original size.
    for (let i in widths) {
        result[widths[i]] = initialUrl;
    }
    return result;
}

/**
 * Builds a set of URLs for lead images with different sizes based on common bucket widths: 320, 640, 800, 1024.
 */
function buildLeadImageUrls(initialUrl) {
    return buildImageUrlSet(initialUrl, [ 320, 640, 800, 1024 ]);
}

/**
 * Builds a set of URLs for small thumbnails suitable for list items.
 */
function buildListThumbUrls(initialUrl) {
    return buildImageUrlSet(initialUrl, [ 60, 120, 320 ]);
}

module.exports = {
    getMetadata: getMetadata,
    getAllSections: getAllSections,
    buildLeadImageUrls: buildLeadImageUrls,
    buildListThumbUrls: buildListThumbUrls,
    checkForQueryPagesInResponse: checkForQueryPagesInResponse,
    requestExtract: requestExtract,
    requestExtractAndDescription: requestExtractAndDescription,
    requestMostReadMetadata: requestMostReadMetadata,
    API_QUERY_MAX_TITLES: API_QUERY_MAX_TITLES,

    // VisibleForTesting
    _buildLeadImageUrls: buildLeadImageUrls
};
