'use strict';

const server = require('../../utils/server');
const checkHeaders = require('../../utils/headers').checkHeaders;
const contentType = require('../../utils/headers').CSS_CONTENT_TYPE_REGEX;

const localUri = path => `${server.config.uri}meta.wikimedia.org/v1/data/css/mobile${path}`;

describe('css', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    it('/base should respond to GET request with expected headers', () => {
        return checkHeaders(localUri('/base'), contentType, 'cache-control');
    });

    it('/site should respond to GET request with expected headers', () => {
        return checkHeaders(localUri('/site'), contentType, 'cache-control');
    });

    it('/bundle should respond to GET request with expected headers', () => {
        return checkHeaders(localUri('/bundle'), contentType, 'cache-control');
    });

});
