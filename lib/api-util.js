'use strict';

const BBPromise = require('bluebird');
const preq = require('preq');
const sUtil = require('./util');
const Template = require('swagger-router').Template;
const HTTPError = sUtil.HTTPError;

const MAX_BATCH_SIZE = 50;


/**
 * Calls the MW API with the supplied query as its body
 * @param {!Object} app the application object
 * @param {string} domain the domain to issue the request to
 * @param {?Object} query an object with all the query parameters for the MW API
 * @return {!Promise} a promise resolving as the response object from the MW API
 */
function mwApiGet(app, domain, query) {

    query = query || {};
    query.continue = query.continue || '';

    const request = app.mwapi_tpl.expand({
        request: {
            params: { domain },
            headers: { 'user-agent': app.conf.user_agent },
            query
        }
    });

    return preq(request).then((response) => {
        if (response.status < 200 || response.status > 399) {
            // there was an error when calling the upstream service, propagate that
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


function _batch(arr, size) {
    const res = [];
    while (arr.length > 0) {
        res.push(arr.splice(0, size));
    }
    return res;
}


/**
 * Calls the MW API with the supplied query as its body
 * @param {!Object} app the application object
 * @param {string} domain the domain to issue the request to
 * @param {?Object} query an object with all the query parameters for the MW API
 * @param {!String[]} titles list of titles to request by batch
 * @param {?Integer} size number of titles to request per batch
 * @return {!Object[]} combined results of the batched queries
 */
function mwApiGetBatched(app, domain, query, titles, size = MAX_BATCH_SIZE) {
    const reqs = _batch(titles, size).map((res) => {
        return mwApiGet(app, domain, Object.assign(query, { titles: res.join('|') }));
    });
    return BBPromise.all(reqs).then((response) => {
        return response.reduce((result, batch) => result.concat(batch.body.query.pages), []);
    });
}


/**
 * Calls the REST API with the supplied domain, path and request parameters
 * @param {!Object} app the application object
 * @param {string} domain the domain to issue the request for
 * @param {!string} path the REST API path to contact without the leading slash
 * @param {?Object} [restReq={}] the object containing the REST request details
 * @param {?string} [restReq.method=get] the request method
 * @param {?Object} [restReq.query={}] the query string to send, if any
 * @param {?Object} [restReq.headers={}] the request headers to send
 * @param {?Object} [restReq.body=null] the body of the request, if any
 * @return {!Promise} a promise resolving as the response object from the REST API
 *
 */
function restApiGet(app, domain, path, restReq) {

    restReq = restReq || {};
    path = path[0] === '/' ? path.slice(1) : path;

    const request = app.restbase_tpl.expand({
        request: {
            method: restReq.method,
            params: { domain, path },
            query: restReq.query,
            headers: Object.assign({ 'user-agent': app.conf.user_agent }, restReq.headers),
            body: restReq.body
        }
    });

    return preq(request);

}


/**
 * Sets up the request templates for MW and RESTBase API requests
 * @param {!Application} app the application object
 */
function setupApiTemplates(app) {

    // set up the MW API request template
    if (!app.conf.mwapi_req) {
        app.conf.mwapi_req = {
            uri: 'http://{{domain}}/w/api.php',
            headers: {
                'user-agent': '{{user-agent}}'
            },
            body: '{{ default(request.query, {}) }}'
        };
    }
    app.mwapi_tpl = new Template(app.conf.mwapi_req);

    // set up the RESTBase request template
    if (!app.conf.restbase_req) {
        app.conf.restbase_req = {
            method: '{{request.method}}',
            uri: 'http://{{domain}}/api/rest_v1/{+path}',
            query: '{{ default(request.query, {}) }}',
            headers: '{{request.headers}}',
            body: '{{request.body}}'
        };
    }
    app.restbase_tpl = new Template(app.conf.restbase_req);

}

/**
 * Checks if the query failed based on the response status code
 * @param {Response} response the response received from the API
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
    return response;
}


module.exports = {
    mwApiGet,
    mwApiGetBatched,
    restApiGet,
    setupApiTemplates,
    checkResponseStatus,

    test: {
        _batch
    }
};

