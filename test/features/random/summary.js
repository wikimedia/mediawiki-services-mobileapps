'use strict';

const assert = require('../../utils/assert.js');
const preq   = require('preq');
const server = require('../../utils/server.js');
const headers = require('../../utils/headers.js');

describe('random/summary', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wikipedia.org/v1/page/random/summary',
            'application/json');
    });

    it('Random page summary should have expected properties', function() {
        return preq.get({ uri: server.config.uri + 'de.wikipedia.org/v1/page/random/summary' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.title.length > 0, 'title should not be empty');
                // It most likely has also a description, extract, and thumbnail, just not guaranteed

                // We can check that there's a source element inside the thumbnail if we got one
                if (res.body.thumbnail) {
                    assert.ok(res.body.thumbnail.source.length > 0, 'thumbnail.source should not be empty');
                }
            });
    });
});
