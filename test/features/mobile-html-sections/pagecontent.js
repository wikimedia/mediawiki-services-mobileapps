'use strict';

// mocha defines to avoid JSHint breakage
/* global describe, it, before, beforeEach, after, afterEach */

var assert = require('../../utils/assert.js');
var preq   = require('preq');
var server = require('../../utils/server.js');

describe('mobile-html-sections', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-html-sections/Test' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                assert.contentType(res, 'application/json');
                assert.deepEqual(res.headers['access-control-allow-origin'], '*');
                assert.deepEqual(res.headers['access-control-allow-headers'], 'Accept, X-Requested-With, Content-Type');
                assert.deepEqual(res.headers['content-security-policy'],
                    "default-src 'self'; object-src 'none'; media-src *; img-src *; style-src *; frame-ancestors 'self'");
                assert.deepEqual(res.headers['x-content-security-policy'],
                    "default-src 'self'; object-src 'none'; media-src *; img-src *; style-src *; frame-ancestors 'self'");
                assert.deepEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
            });
    });
    it('should have a page object with expected properties', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-html-sections/Test' })
            .then(function(res) {
                var page = res.body.page;
                assert.deepEqual(res.status, 200);
                assert.ok(page.lastmodified.startsWith('201'), page.lastmodified + ' should start with 201'); // 2015-
                assert.deepEqual(page.displaytitle, 'Test');
                assert.deepEqual(page.protection, []);
                assert.deepEqual(page.editable, true);
                assert.ok(page.sections.length > 0, 'Expected at least one section element');
                assert.deepEqual(page.sections[0].id, 0);
                assert.ok(page.sections[0].text.length > 0, 'Expected text to be non-empty');
            });
    });
});