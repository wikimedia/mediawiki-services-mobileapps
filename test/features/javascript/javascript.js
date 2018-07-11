'use strict';

const preq = require('preq');
const assert = require('../../utils/assert');
const server = require('../../utils/server');
const checkHeaders = require('../../utils/headers').checkHeaders;
const contentType = require('../../utils/headers').JS_CONTENT_TYPE_REGEX;

const localUri = path => `${server.config.uri}meta.wikimedia.org/v1/data/javascript/mobile${path}`;

describe('css', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => server.start());

    ['/pagelib'].forEach((jsType) => {
        it(`${jsType} should respond to GET request with expected headers`, () => {
            return checkHeaders(localUri(jsType), contentType, 'cache-control');
        });

        it(`${jsType} response should have non-zero length`, () => {
            return preq.get(localUri(jsType)).then(res => assert.ok(res.body.length > 0));
        });
    });
});
