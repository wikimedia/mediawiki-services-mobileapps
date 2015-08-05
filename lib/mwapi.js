/**
 * MediaWiki API helpers
 */

'use strict';

var preq = require('preq');
var sUtil = require('../lib/util');

// shortcut
var HTTPError = sUtil.HTTPError;

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
        uri: 'http://' + domain + '/w/api.php',
        query: params
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
        "prop": "text|sections|thumb|image|id|revision|description|lastmodified|normalizedtitle|displaytitle|protection|editable",
        "sections": "all",
        "sectionprop": "toclevel|line|anchor",
        "noheadings": true
    });
}

function checkApiResponse(response) {
    // check if the query failed
    if (response.status > 299) {
        // there was an error in the MW API, propagate that
        throw new HTTPError({
            status: response.status,
            type: 'api_error',
            title: 'MW API error',
            detail: response.body
        });
    }
}

function checkForQueryPagesInResponse(logger, response) {
    if (!response.body.query || !response.body.query.pages) {
        // we did not get our expected query.pages from the MW API, propagate that
        logger.log('error', 'no query.pages in response: ' + JSON.stringify(response, null, 2));
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
    checkApiResponse: checkApiResponse,
    checkForQueryPagesInResponse: checkForQueryPagesInResponse
};