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
 * Calls the MW API with the supplied query as its body
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
 * @param {!object} req the request object
 * @param {?Object} query an object with all the query parameters for the MW API
 * @param {!String[]} titles list of titles to request by batch
 * @param {?string} altDomain domain to query, if other than the original request domain
 * @param {?Object} addlHeaders additional headers to send
 * @param {?Integer} size number of titles to request per batch
 * @return {!Object[]} combined results of the batched queries
 */
function mwApiGetBatched(req, query, titles, altDomain, addlHeaders, size = MAX_BATCH_SIZE) {
    const reqs = _batch(titles, size).map((res) => {
        return mwApiGet(req, Object.assign(query, { titles: res.join('|') }), altDomain, addlHeaders);
    });
    return BBPromise.all(reqs).then((response) => {
        return response.reduce((result, batch) => {
            // Check for query or entities, depending on the api action
            const batchResult = (batch.body.query && batch.body.query.pages)
                || batch.body.entities;
            return result.concat(batchResult);
        }, []);
    });
}

/**
 * Calls the REST API with the supplied domain, path and request parameters
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
 * Gets the externally visible REST API URI for the supplied domain.
 * Do not use this for actual requests made inside the DC.
 * @param {!string} domain the domain to issue the request for
 * @return {!string} the URI for externally visible RESTBase endpoints for the given domain
 */
function getExternalRestApiUri(domain) {
    return `https://${domain}/api/rest_v1/`;
}

/**
 * Sets up the request templates for MW and RESTBase API requests
 * @param {!Application} app the application object
 */
function setupApiTemplates(app) {

    // set up the MW API request template
    if (!app.conf.mwapi_req) {
        app.conf.mwapi_req = {
            method: 'post',
            uri: 'http://{{domain}}/w/api.php',
            headers: '{{request.headers}}',
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

/**
 * @param {!string} domain the domain to get the language code for
 * @return {?string} the language code for the domain or undefined
 * if it could not be determined
 */
function getLanguageCode(domain) {
    if (!domain) {
        return undefined;
    }
    let components = domain.split('.');
    if (components.length < 2) {
        return undefined;
    }
    if (components[components.length - 2] !== 'wikipedia') {
        return undefined;
    }
    return components[0];
}

const codesWithVariants = {
    crh: true,
    gan: true,
    iu: true,
    kk: true,
    ku: true,
    shi: true,
    sr: true,
    tg: true,
    uz: true,
    zh: true
};

/**
 * @param {!string} the language code to check
 * @return {!boolean} whether or not the language code supports variants
 */
function isLanguageCodeWithVariants(code) {
    if (!code) {
        return false;
    }
    return codesWithVariants[code];
}

module.exports = {
    // Shared with service-template-node
    mwApiGet,
    restApiGet,
    setupApiTemplates,

    // Local methods
    mwApiGetBatched,
    getExternalRestApiUri,
    checkResponseStatus,
    getLanguageCode,
    isLanguageCodeWithVariants,
    test: {
        _batch
    }
};
