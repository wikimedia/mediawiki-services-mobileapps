'use strict';

// mocha defines to avoid JSHint breakage
/* global describe, it, before, beforeEach, after, afterEach */

var assert = require('../../utils/assert.js');
var preq   = require('preq');
var server = require('../../utils/server.js');
var headers = require('../../utils/headers.js');

describe('mobile-html-sections-lead', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'test.wikipedia.org/v1/page/mobile-html-sections-lead/Test',
            'application/json');
    });
    it('Test page should have a lead object with expected properties', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-html-sections-lead/Test' })
            .then(function(res) {
                var lead = res.body;
                assert.deepEqual(res.status, 200);
                assert.ok(lead.lastmodified.startsWith('201'), lead.lastmodified + ' should start with 201'); // 2015-
                assert.deepEqual(lead.displaytitle, 'Test');
                assert.deepEqual(lead.protection, []);
                assert.deepEqual(lead.editable, true);
                assert.ok(lead.sections.length > 0, 'Expected at least one section element');
                assert.deepEqual(lead.sections[0].id, 0);
                assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');
            });
    });
    it('en Cat page should have a lead object with expected properties', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-html-sections-lead/Cat' })
            .then(function(res) {
                var lead = res.body;
                assert.deepEqual(res.status, 200);
                assert.ok(lead.lastmodified.startsWith('201'), lead.lastmodified + ' should start with 201'); // 2015-
                assert.deepEqual(lead.displaytitle, 'Cat');
                assert.deepEqual(lead.protection, {
                    "edit": [
                        "autoconfirmed"
                    ],
                    "move": [
                        "sysop"
                    ]
                });
                assert.deepEqual(lead.editable, false);
                assert.deepEqual(lead.image, {
                    "file": "Cat poster 1.jpg",
                    "urls": {
                        "640": "//upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cat_poster_1.jpg/640px-Cat_poster_1.jpg",
                        "800": "//upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cat_poster_1.jpg/800px-Cat_poster_1.jpg",
                        "1024": "//upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cat_poster_1.jpg/1024px-Cat_poster_1.jpg"
                    }
                });
                assert.ok(lead.infobox.length > 0, 'Expected at least one infobox row');
                assert.ok(lead.infobox[0].length > 0, 'Expected at least one infobox column');
                assert.deepEqual(lead.infobox[0][0], 'Domestic cat<sup id="cite_ref-MSW3fc_1-0" class="reference"><a href="#cite_note-MSW3fc-1">[1]</a></sup>');
                assert.ok(lead.sections.length > 0, 'Expected at least one section element');
                assert.deepEqual(lead.sections[0].id, 0);
                assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');
            });
    });
    it('en San Francisco should have a lead object with a geo property', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-html-sections-lead/San_Francisco' })
            .then(function(res) {
                var lead = res.body;
                assert.deepEqual(lead.geo.latitude, 37.783);
                assert.deepEqual(lead.geo.longitude, -122.417);
            });
    });
    it('en San Francisco should have a lead object with an extract', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-html-sections-lead/San_Francisco' })
            .then(function(res) {
                var lead = res.body;
                assert.ok(lead.extract.length > 0);
            });
    });
    it('Obama (redirect) should have a lead image', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-html-sections-lead/Obama' })
            .then(function(res) {
                var lead = res.body;
                assert.deepEqual(res.status, 200);
                assert.contains(lead.image.file, "Obama");
                assert.contains(lead.image.urls["640"], "//upload.wikimedia.org/wikipedia/commons/thumb");
                assert.contains(lead.image.urls["640"], "640px-");
                assert.contains(lead.image.urls["800"], "//upload.wikimedia.org/wikipedia/commons/thumb");
                assert.contains(lead.image.urls["800"], "800px-");
                assert.contains(lead.image.urls["1024"], "//upload.wikimedia.org/wikipedia/commons/thumb");
                assert.contains(lead.image.urls["1024"], "1024px-");
                assert.ok(lead.media.items.length > 3, 'Expected many media items');
            });
    });
    it('Barack Obama should have a pronunciation', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-html-sections-lead/Barack_Obama' })
            .then(function(res) {
                var lead = res.body;
                assert.deepEqual(res.status, 200);
                assert.deepEqual(lead.pronunciation.url, '/wiki/File:En-us-Barack-Hussein-Obama.ogg');
            });
    });
    it('en Main page should have at least one image', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-html-sections-lead/Main_Page' })
            .then(function(res) {
                var lead = res.body;
                assert.ok(lead.media.items.length > 0, 'Expected at least one media item');
            });
    });
});
