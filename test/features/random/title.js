'use strict';

var assert = require('../../utils/assert.js');
var preq   = require('preq');
var server = require('../../utils/server.js');
var headers = require('../../utils/headers.js');

describe('random/title', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wikipedia.org/v1/page/random/title',
            'application/json');
    });

    it('Random page title should have expected properties', function() {
        return preq.get({ uri: server.config.uri + 'de.wikipedia.org/v1/page/random/title' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.items[0].title.length > 0, 'title should not be empty');
            });
    });
});
