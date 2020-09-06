'use strict';

const BBPromise = require('bluebird');
const dateUtil = require('../../lib/dateUtil');
const Template = require('swagger-router').Template;
const aUtil    = require('../../lib/api-util');
const fixtures = require('./fixtures');
const preq = require('preq');
const mockReq = require('sinon-express-mock').mockReq;
const uuidv1 = require('uuid/v1');
const HTTPError = require('../../lib/util').HTTPError;

const testUtil = {};

/**
 * Construct a date string from a Date object.  Used for testing.
 * Example: "2016/05/16"
 *
 * @param {!Date} dateObj date to be used
 * @return {!string} formatted date string
 */
testUtil.constructTestDate = function(dateObj) {
    return `${dateObj.getUTCFullYear()}/${
        dateUtil.pad(dateObj.getUTCMonth() + 1)}/${
        dateUtil.pad(dateObj.getUTCDate())}`;
};

testUtil.rbTemplate = new Template({
    method: '{{request.method}}',
    uri: 'https://{{domain}}/api/rest_v1/{+path}',
    query: '{{ default(request.query, {}) }}',
    headers: '{{request.headers}}',
    body: '{{request.body}}'
});

/**
 * @param {!string} fileName name of the fixture file to load
 * @return {!Document}
 */
testUtil.readTestFixtureDoc = fixtures.readIntoDocument;

/**
 * @param {!object} options app configuration options
 * @return {!object} mocked app object
 */
testUtil.getMockedApp = (options = {}) => {
    const mockedApp = Object.assign({
        conf: {
            user_agent: 'WMF Mobile Content Service dev test',
        }
    }, options);
    aUtil.setupApiTemplates(mockedApp);
    return mockedApp;
};

/**
 * @param {!object} options req configuration for mock
 * @return {!object} mocked service request
 */
testUtil.getMockedServiceReq = (options) => {
    options = Object.assign({
        headers: {},
        app: testUtil.getMockedApp(),
    }, options);

    const req = mockReq(options);

    req.issueRequest = (request) => {
        if (!(request.constructor === Object)) {
            request = { uri: request };
        }
        if (request.url) {
            request.uri = request.url;
            delete request.url;
        }
        if (!request.uri) {
            return BBPromise.reject(new HTTPError({
                status: 500,
                type: 'internal_error',
                title: 'No request to issue',
                detail: 'No request has been specified'
            }));
        }
        request.method = request.method || 'get';
        request.headers = request.headers || {};
        Object.assign(request.headers, {
            'user-agent': options.app.conf.user_agent,
            'x-request-id': req.headers['x-request-id'] || uuidv1()
        });
        return preq(request);
    };

    return req;
};

module.exports = testUtil;
