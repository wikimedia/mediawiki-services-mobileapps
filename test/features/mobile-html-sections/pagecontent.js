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

    it('return the sent ETag', function() {
        return preq.get({
            uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-html-sections/Test',
            headers: { 'x-restbase-etag': '123456/c3421381-7109-11e5-ac43-8c7f067c3520' }
        }).then(function(res) {
            assert.status(res, 200);
            assert.deepEqual(res.headers.etag, '123456/c3421381-7109-11e5-ac43-8c7f067c3520');
        });
    });

    it('Sections/deep page should have a lead object with expected properties', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-html-sections/Sections%2Fdeep' })
            .then(function(res) {
                var lead = res.body.lead;
                assert.deepEqual(res.status, 200);
                assert.ok(lead.lastmodified.startsWith('201'), lead.lastmodified + ' should start with 201'); // 2015-
                assert.deepEqual(lead.displaytitle, 'Sections/deep');
                assert.ok(!lead.protection, 'Page should not be protected');
                assert.deepEqual(lead.editable, true);
                assert.ok(lead.sections.length >= 6, 'Expected at least six section elements');
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
                assert.deepEqual(lead.normalizedtitle, 'Main Page');
                assert.deepEqual(lead.description, 'main page of a Wikimedia project');
                assert.deepEqual(lead.protection, {
                    "edit": [
                        "sysop"
                    ],
                    "move": [
                        "sysop"
                    ]
                });
                assert.deepEqual(lead.editable, false);
                assert.deepEqual(lead.mainpage, true);
                assert.ok(lead.languagecount > 10);
                assert.ok(lead.sections.length > 0, 'Expected at least one section element');
                assert.deepEqual(lead.sections[0].id, 0);
                assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');

                assert.ok(lead.media.items.length > 0, 'Expected at least one media item');
            });
    });
    it('Obama (redirect) should have a lead image, expected properties, and many media items', function() {
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

                assert.deepEqual(lead.description, "44th President of the United States");
                assert.deepEqual(lead.redirected, "Barack Obama");
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
    it('Missing title should respond with 404', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-html-sections/fldksfkjhajkfhjk' })
            .then(function(res) {
                assert.fail("expected an exception to be thrown");
            }).catch(function(res) {
                var body = res.body;
                assert.deepEqual(res.status, 404);
                assert.deepEqual(body.status, 404);
                assert.deepEqual(body.type, 'missingtitle');
                assert.deepEqual(body.title, "The page you requested doesn't exist");
            });
    });
});
