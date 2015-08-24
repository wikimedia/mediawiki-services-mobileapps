'use strict';

// mocha defines to avoid JSHint breakage
/* global describe, it, before, beforeEach, after, afterEach */

var assert = require('../../utils/assert.js');
var preq   = require('preq');
var server = require('../../utils/server.js');
var headers = require('../../utils/headers.js');

describe('mobile-html-sections', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'test.wikipedia.org/v1/page/mobile-html-sections/Test',
            'application/json');
    });
    it('Test page should have a lead object with expected properties', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-html-sections/Test' })
            .then(function(res) {
                var lead = res.body.lead;
                assert.deepEqual(res.status, 200);
                assert.ok(lead.lastmodified.startsWith('201'), lead.lastmodified + ' should start with 201'); // 2015-
                assert.deepEqual(lead.displaytitle, 'Test');
                assert.deepEqual(lead.protection, []);
                assert.deepEqual(lead.editable, true);
                assert.deepEqual(lead.image, {});
                assert.ok(lead.sections.length > 0, 'Expected at least one section element');
                assert.deepEqual(lead.sections[0].id, 0);
                assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');
            });
    });
    it('en Main page should have a lead object with expected properties', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-html-sections/Main_Page' })
            .then(function(res) {
                var lead = res.body.lead;
                assert.deepEqual(res.status, 200);
                assert.ok(lead.lastmodified.startsWith('201'), lead.lastmodified + ' should start with 201'); // 2015-
                assert.deepEqual(lead.displaytitle, 'Main Page');
                assert.deepEqual(lead.protection, {
                    "edit": [
                        "sysop"
                    ],
                    "move": [
                        "sysop"
                    ]
                });
                assert.deepEqual(lead.editable, false);
                assert.ok(lead.languagecount > 10);
                assert.deepEqual(lead.image, {});
                assert.ok(lead.sections.length > 0, 'Expected at least one section element');
                assert.deepEqual(lead.sections[0].id, 0);
                assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');

                assert.ok(lead.media.items.length > 0, 'Expected at least one media item');
            });
    });
    it('Obama (redirect) should have a lead image and many media items', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-html-sections/Obama' })
            .then(function(res) {
                var lead = res.body.lead;
                assert.deepEqual(res.status, 200);
                assert.contains(lead.image.file, "Obama");
                assert.contains(lead.image.urls["640"], "//upload.wikimedia.org/wikipedia/commons/thumb");
                assert.contains(lead.image.urls["640"], "640px-");
                assert.contains(lead.image.urls["800"], "//upload.wikimedia.org/wikipedia/commons/thumb");
                assert.contains(lead.image.urls["800"], "800px-");
                assert.contains(lead.image.urls["1024"], "//upload.wikimedia.org/wikipedia/commons/thumb");
                assert.contains(lead.image.urls["1024"], "1024px-");

                assert.ok(lead.media.items.length > 3, 'Expected many media items');

                var remaining = res.body.remaining;
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
