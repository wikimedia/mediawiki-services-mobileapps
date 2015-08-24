'use strict';

// mocha defines to avoid JSHint breakage
/* global describe, it, before, beforeEach, after, afterEach */

var assert = require('../../utils/assert.js');
var preq   = require('preq');
var server = require('../../utils/server.js');
var headers = require('../../utils/headers.js');

describe('mobile-html-sections-remaining', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'test.wikipedia.org/v1/page/mobile-html-sections-remaining/Test',
            'application/json');
    });
    it('Obama (redirect) should have at least one video, and many images', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-html-sections-remaining/Obama' })
            .then(function(res) {
                var remaining = res.body;
                assert.ok(remaining.sections.length > 3, 'Expected many remaining sections but got '
                    + remaining.sections.length); // 1, 2, 3, many ;)
                assert.deepEqual(remaining.sections[0].id, 1);
                assert.deepEqual(remaining.sections[0].toclevel, 1);
                assert.ok(remaining.sections[0].text.length > 3);
                assert.ok(remaining.sections[0].line.length > 3);
                assert.ok(remaining.sections[0].anchor.length > 3);
            });
    });
});