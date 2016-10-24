'use strict';

var preq   = require('preq');
var assert = require('../../utils/assert');
var server = require('../../utils/server');
var headers = require('../../utils/headers');
var random = require('../../../lib/feed/random');
var sample =  require('./sample-results');

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

    it('pickBestResult should select best-scored title from sample', function() {
        var best = random.pickBestResult(sample);
        assert.ok(best.title === 'William Ellis (Medal of Honor)');
    })
});
