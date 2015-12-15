'use strict';

// mocha defines to avoid JSHint breakage
/* global describe, it, before, beforeEach, after, afterEach */

var assert = require('../../utils/assert.js');
var preq   = require('preq');
var server = require('../../utils/server.js');
var headers = require('../../utils/headers.js');

describe('mobile-summary', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wikipedia.org/v1/page/mobile-summary/Foobar',
            'application/json');
    });
    it('en Cat page should have expected properties', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-summary/Cat' })
            .then(function(res) {
                var body = res.body;
                assert.deepEqual(res.status, 200);
                assert.deepEqual(body.title, 'Cat');
                assert.ok(body.extract.indexOf('The domestic cat, often referred to as "Kitty" is a') === 0, 'Expected different start of extract');
                assert.deepEqual(body.thumbnail, {
                    "source": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cat_poster_1.jpg/320px-Cat_poster_1.jpg"
                });
                assert.ok(body.infobox.length > 0, 'Expected at least one infobox row');
                assert.ok(body.infobox[0].length > 0, 'Expected at least one infobox column');
                assert.ok(body.infobox[0][0].indexOf('Domestic cat<s') === 0);
            });
    });
});
