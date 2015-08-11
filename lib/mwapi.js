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
 * A helper function that obtains the HTML from the MW API and
 * loads it into a domino DOM document instance.
 *
 * @param {String} domain the domain to contact
 * @param {Object} params an Object with all the query parameters for the MW API
 * @return {Promise} a promise resolving as the HTML element object
 */
function apiGet(domain, params) {
    // get the page from the MW API
    return preq.get({
        uri: 'https://' + domain + '/w/api.php',
        query: params
    }).then(function(response) {
        // check if the query failed
        if (response.status < 200 || response.status > 299) {
            // there was an error in the MW API, propagate that
            throw new HTTPError({
                status: response.status,
                type: 'api_error',
                title: 'MW API error',
                detail: response.body
            });
        }
        return response;
    });
}

/**
 *
 * Builds the request to get all sections from MW API action=mobileview.
 *
 * @param {String} domain the domain to contact
 * @return {Promise} a promise resolving as the HTML element object
 */
function getAllSections(domain, title) {
    return apiGet(domain, {
        "action": "mobileview",
        "format": "json",
        "page": title,
        "prop": "text|sections|languagecount|thumb|image|id|revision|description|lastmodified|normalizedtitle|displaytitle|protection|editable",
        "sections": "all",
        "sectionprop": "toclevel|line|anchor",
        "noheadings": true,
        "thumbsize": DEFAULT_LEAD_IMAGE_WIDTH
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

function checkForQueryPagesInResponse(logger, response) {
    if (!(response && response.body && response.body.query && response.body.query.pages)) {
        // we did not get our expected query.pages from the MW API, propagate that
        logger.log('error/mwapi', 'no query.pages in response: ');
        throw new HTTPError({
            status: response.status,
            type: 'api_error',
            title: 'no query.pages in response',
            detail: response.body
        });
    }
}

module.exports = {
    apiGet: apiGet,
    getAllSections: getAllSections,
    buildLeadImageUrls: buildLeadImageUrls,
    checkForQueryPagesInResponse: checkForQueryPagesInResponse
};
