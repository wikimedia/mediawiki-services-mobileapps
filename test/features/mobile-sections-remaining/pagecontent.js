'use strict';

const server = require('../../utils/server.js');
const headers = require('../../utils/headers.js');

describe('mobile-sections-remaining', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wikipedia.org/v1/page/mobile-sections-remaining/Foobar');
    });
});
