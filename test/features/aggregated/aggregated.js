'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert');
var server = require('../../utils/server');
var headers = require('../../utils/headers');
var dateUtil = require('../../../lib/dateUtil');

var date = new Date();
var dateString = date.getUTCFullYear() + '/' + dateUtil.pad(date.getUTCMonth()) + '/' + dateUtil.pad(date.getUTCDate());

describe('aggregated feed endpoint', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wikipedia.org/v1/feed/featured/' + dateString);
    });

    it('Response should contain all expected properties', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/feed/featured/' + dateString })
            .then(function(res) {
                var body = res.body;
                assert.deepEqual(res.status, 200);
                assert.ok(body.hasOwnProperty('tfa'), 'Should have today\'s featured article');
                if (body.hasOwnProperty('mostread')) {
                      assert.ok(body.mostread.articles.length, 'Should have most-read articles');
                }
                assert.ok(body.hasOwnProperty('random'), 'Should have random article');
                assert.ok(body.hasOwnProperty('news'), 'Should have today\'s news');
                assert.ok(body.hasOwnProperty('image'), 'Should have today\'s featured image');
                assert.ok(body.hasOwnProperty('video'), 'Should have today\'s featured video');
            });
    });

    it('non-enwiki doesn\'t have tfa or news entries', function() {
        return preq.get({ uri: server.config.uri + 'fr.wikipedia.org/v1/feed/featured/' + dateString })
            .then(function(res) {
                var body = res.body;
                assert.deepEqual(res.status, 200);
                assert.ok(!body.hasOwnProperty('tfa'), 'Should not have today\'s featured article');
                assert.ok(!body.hasOwnProperty('news'), 'Should not have today\'s news');
                if (body.hasOwnProperty('mostread')) {
                      assert.ok(body.mostread.articles.length, 'Should have most-read articles');
                }
                assert.ok(body.hasOwnProperty('random'), 'Should have random article');
                assert.ok(body.hasOwnProperty('image'), 'Should have today\'s featured image');
                assert.ok(body.hasOwnProperty('video'), 'Should have today\'s featured video');
            });
    });
});
