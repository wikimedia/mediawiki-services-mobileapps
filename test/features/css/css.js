'use strict';

const server = require('../../utils/server');
const checkHeaders = require('../../utils/headers').checkHeaders;
const contentType = require('../../utils/headers').CSS_CONTENT_TYPE_REGEX;

const localUri = path => `${server.config.uri}meta.wikimedia.org/v1/page/css/${path}`;

describe('css', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    it('should respond to GET request with expected headers', () => {
        return checkHeaders(localUri('base'), contentType, 'cache-control');
    });

});
