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
        return headers.checkHeaders(server.config.uri + 'en.wikipedia.org/v1/page/mobile-html-sections-lead/Foobar',
            'application/json');
    });
    it('Sections/deep page should have a lead object with expected properties', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-html-sections-lead/Sections%2Fdeep' })
            .then(function(res) {
                var lead = res.body;
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
    it('en Cat page should have a lead object with expected properties', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-html-sections-lead/Cat' })
            .then(function(res) {
                var lead = res.body;
                assert.deepEqual(res.status, 200);
                assert.ok(lead.lastmodified.startsWith('201'), lead.lastmodified + ' should start with 201'); // 2015-
                assert.deepEqual(lead.displaytitle, 'Cat');
                assert.deepEqual(lead.description, 'species');
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
                assert.ok(lead.spoken.files.length > 0, 'Expected at least one Spoken Wikipedia audio file');
                assert.ok(lead.spoken.files[0].indexOf('.') > -1, 'Expected file extension in spoken filename');
                assert.ok(lead.spoken.files[0].indexOf('File:') === 0, 'Expected File namespace in filename');
                assert.ok(lead.infobox.length > 0, 'Expected at least one infobox row');
                assert.ok(lead.infobox[0].length > 0, 'Expected at least one infobox column');
                assert.ok(lead.infobox[0][0].indexOf('Domestic cat<s') === 0);
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
            });
    });
    it('Barack Obama should have a pronunciation', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-html-sections-lead/Barack_Obama' })
            .then(function(res) {
                var lead = res.body;
                assert.deepEqual(res.status, 200);
                assert.deepEqual(lead.pronunciation.url, '//upload.wikimedia.org/wikipedia/commons/8/82/En-us-Barack-Hussein-Obama.ogg');
            });
    });
});
