'use strict';

const BBPromise = require('bluebird');
const querystring = require('querystring');
const sUtil = require('./util');
const Template = require('swagger-router').Template;
const HTTPError = sUtil.HTTPError;

const MAX_BATCH_SIZE = 50;

function prettyMwApiReq(request) {
    // formatting it as GET request even though we use POST requests for MW API,
    // just because GETs are easier to run from commandline or see it in a browser
    return `${request.uri}?${querystring.stringify(request.body)}`;
}

/**
 * Make a request for ResourceLoader modules to MediaWiki's load.php entry point.
 *
 * @param {!Object} req the incoming request object
 * @param {?Object} query an object with all the query parameters for the MW API
 * @return {!Promise}
 */
function mwLoadResourceLoaderModules(req, query) {
    const app = req.app;
    const request = app.mw_resource_loader_tpl.expand({
        request: {
            params: { domain: req.params.domain },
            headers: Object.assign(req.headers),
            query
        },
    });
    if (app.conf.debug) {
        app.logger.log('trace/mwLoadResourceLoaderModules', {
            msg: 'Outgoing MW API request',
            to: prettyMwApiReq(request)
        });
    }
    return req.issueRequest(request);
}

/**
 * Calls the MW API with the supplied query as its body
 *
 * @param {!Object} req the incoming request object
 * @param {?Object} query an object with all the query parameters for the MW API
 * @param {?string} altDomain domain to query, if other than the original request domain
 * @param {?Object} addlHeaders additional headers to pass to the MW API
 * @return {!Promise} a promise resolving as the response object from the MW API
 */
function mwApiGet(req, query, altDomain, addlHeaders) {

    const app = req.app;
    query = Object.assign({
        format: 'json',
        formatversion: 2
    }, query);

    const request = app.mwapi_tpl.expand({
        request: {
            params: { domain: altDomain || req.params.domain },
            headers: req.headers,
            query
        }
    });
    Object.assign(request.headers, addlHeaders);

    if (app.conf.debug) {
        app.logger.log('trace/mwApiGet', { msg: 'Outgoing MW API request', to: prettyMwApiReq(request) });
    }

    try {
        return req.issueRequest(request).then((response) => {
            if (response.status < 200 || response.status > 399) {
                // there was an error when calling the upstream service, propagate that
                return BBPromise.reject(new HTTPError({
                    status: response.status,
                    type: 'api_error',
                    title: 'MW API error',
                    detail: response.body
                }));
            }
            return response;
        });
    } catch (e) {
        // In case of timeout, log some info about the underlying request, since nothing useful is
        // captured in the error thrown by preq in this case
        if (e.message === 'ETIMEDOUT') {
            app.logger.log('error/mwApiGet', { msg: 'MW API request timeout', to: prettyMwApiReq(request) });
        }
        throw e;
    }

}

function _batch(arr, size) {
    const res = [];
    while (arr.length > 0) {
        res.push(arr.splice(0, size));
    }
    return res;
}

/**
 * Calls the MW API with the supplied entities as its body
 *
 * @param {!object} req the request object
 * @param {?Object} query an object with all the query parameters for the MW API
 * @param {!String[]} titles list of titles to request by batch
 * @param {?string} altDomain domain to query, if other than the original request domain
 * @param {?Object} addlHeaders additional headers to send
 * @param {?Integer} size number of titles to request per batch
 * @return {!Object[]} combined results of the batched queries
 */
function mwApiGetEntitiesBatched(req, query, titles, altDomain, addlHeaders,
    size = MAX_BATCH_SIZE) {
    const reqs = _batch(titles, size).map((res) => {
        return mwApiGet(req, Object.assign(query, { titles: res.join('|') }), altDomain, addlHeaders);
    });
    return BBPromise.all(reqs).then((response) => {
        return response.reduce((result, batch) => {
            // Check for query or entities, depending on the api action
            const batchResult = batch.body.entities;
            return result.concat(batchResult);
        }, []);
    });
}

/**
 * Calls the MW API with the supplied query as its body
 *
 * @param {!object} req the request object
 * @param {?Object} query an object with all the query parameters for the MW API
 * @param {!String[]} titles list of titles to request by batch
 * @param {?string} altDomain domain to query, if other than the original request domain
 * @param {?Object} addlHeaders additional headers to send
 * @param {?Integer} size number of titles to request per batch
 * @return {!Object[]} combined results of the batched queries
 */
function mwApiGetQueryBatched(req, query, titles, altDomain, addlHeaders, size = MAX_BATCH_SIZE) {
    const reqs = _batch(titles, size).map((res) => {
        return mwApiGet(req, Object.assign(query, { titles: res.join('|') }), altDomain, addlHeaders);
    });
    return BBPromise.all(reqs).then((response) => {
        return response.reduce((result, batch) => {
            const batchResultKeys = Object.keys(result);
            if (!batchResultKeys.length) {
                return batch.body.query;
            }
            // Merge query items to return all batches with depth 1
            batchResultKeys.forEach(key => {
                if (batch.body.query[key]) {
                    result[key].concat(batch.body.query[key]);
                }
            });
            return result;
        }, {});
    });
}

/**
 * Calls the REST API with the supplied domain, path and request parameters
 *
 * @param {!Object} req the incoming request object
 * @param {?string} path the REST API path to contact without the leading slash
 * @param {?Object} [restReq={}] the object containing the REST request details
 * @param {?string} [restReq.method=get] the request method
 * @param {?Object} [restReq.query={}] the query string to send, if any
 * @param {?Object} [restReq.headers={}] the request headers to send
 * @param {?Object} [restReq.body=null] the body of the request, if any
 * @return {!Promise} a promise resolving as the response object from the REST API
 *
 */
function restApiGet(req, path, restReq) {

    const app = req.app;
    if (path.constructor === Object) {
        restReq = path;
        path = undefined;
    }
    restReq = restReq || {};
    restReq.method = restReq.method || 'get';
    restReq.query = restReq.query || {};
    restReq.headers = restReq.headers || {};
    restReq.params = restReq.params || {};
    restReq.params.path = path || restReq.params.path;
    restReq.params.domain = restReq.params.domain || req.params.domain;
    if (!restReq.params.path || !restReq.params.domain) {
        return BBPromise.reject(new HTTPError({
            status: 500,
            type: 'internal_error',
            title: 'Invalid internal call',
            detail: 'domain and path need to be defined for the REST API call'
        }));
    }
    restReq.params.path = restReq.params.path[0] === '/' ?
        restReq.params.path.slice(1) : restReq.params.path;

    return req.issueRequest(app.restbase_tpl.expand({ request: restReq }));

}

/**
 * Sets up the request templates for MW and RESTBase API requests
 *
 * @param {!Application} app the application object
 */
function setupApiTemplates(app) {

    // set up the MW API request template
    if (!app.conf.mwapi_req) {
        app.conf.mwapi_req = {
            method: 'post',
            uri: 'https://{{domain}}/w/api.php',
            headers: '{{request.headers}}',
            body: '{{ default(request.query, {}) }}'
        };
    }
    app.mwapi_tpl = new Template(app.conf.mwapi_req);

    // set up the RESTBase request template
    if (!app.conf.restbase_req) {
        app.conf.restbase_req = {
            method: '{{request.method}}',
            uri: 'https://{{domain}}/api/rest_v1/{+path}',
            query: '{{ default(request.query, {}) }}',
            headers: '{{request.headers}}',
            body: '{{request.body}}'
        };
    }
    app.restbase_tpl = new Template(app.conf.restbase_req);

    // set up the MediaWiki page request template
    if (!app.conf.mw_resource_loader_req) {
        app.conf.mw_resource_loader_req = {
            method: '{{request.method}}',
            uri: 'https://{{domain}}/w/load.php',
            query: '{{ default(request.query, {}) }}',
            headers: '{{request.headers}}'
        };
    }
    app.mw_resource_loader_tpl = new Template(app.conf.mw_resource_loader_req);

}

/**
 * Checks if the query failed based on the response status code
 *
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

const PROD_COMMONS_DOMAIN = 'commons.wikimedia.org';
const BETA_COMMONS_DOMAIN = 'commons.wikimedia.beta.wmflabs.org';

/**
 * Get the correct Commons domain to handle the request.
 *
 * @param {!string} domain original request domain
 * @return {!string} Commons domain for beta or prod
 */
function getCommonsDomain(domain) {
    return domain.endsWith('beta.wmflabs.org') ? BETA_COMMONS_DOMAIN : PROD_COMMONS_DOMAIN;
}

module.exports = {
    // Shared with service-template-node
    mwApiGet,
    restApiGet,
    setupApiTemplates,

    // Local methods
    mwApiGetEntitiesBatched,
    mwApiGetQueryBatched,
    checkResponseStatus,
    getCommonsDomain,
    mwLoadResourceLoaderModules,
    test: {
        _batch
    }
};
