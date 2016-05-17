'use strict';

var assert = require('../../utils/assert.js');
var preq   = require('preq');
var server = require('../../utils/server.js');
var headers = require('../../utils/headers.js');

describe('mobile-sections-lead', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wikipedia.org/v1/page/mobile-sections-lead/Foobar',
            'application/json');
    });
    it('Sections/deep page should have a lead object with expected properties', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-sections-lead/Sections%2Fdeep' })
            .then(function(res) {
                var lead = res.body;
                assert.deepEqual(res.status, 200);
                assert.ok(lead.lastmodified.startsWith('201'), lead.lastmodified + ' should start with 201'); // 2015-
                assert.deepEqual(lead.displaytitle, 'Sections/deep');
                assert.ok(lead.protection.constructor === Object, 'lead.protection should be an Object');
                assert.ok(!Object.keys(lead.protection).length, 'Page should not be protected');
                assert.deepEqual(lead.editable, true);
                assert.ok(lead.sections.length >= 6, 'Expected at least six section elements');
                assert.deepEqual(lead.sections[0].id, 0);
                assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');
            });
    });
    it('en Cat page should have a lead object with expected properties', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-sections-lead/Cat' })
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
                        "320": "//upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cat_poster_1.jpg/320px-Cat_poster_1.jpg",
                        "640": "//upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cat_poster_1.jpg/640px-Cat_poster_1.jpg",
                        "800": "//upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cat_poster_1.jpg/800px-Cat_poster_1.jpg",
                        "1024": "//upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cat_poster_1.jpg/1024px-Cat_poster_1.jpg"
                    }
                });
                assert.ok(lead.spoken.files.length > 0, 'Expected at least one Spoken Wikipedia audio file');
                assert.ok(lead.spoken.files[0].indexOf('.') > -1, 'Expected file extension in spoken filename');
                assert.ok(lead.spoken.files[0].indexOf('File:') === 0, 'Expected File namespace in filename');
                assert.ok(lead.sections.length > 0, 'Expected at least one section element');
                assert.deepEqual(lead.sections[0].id, 0);
                assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');
            });
    });
    it('en San Francisco should have a lead object with a geo property', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-sections-lead/San_Francisco' })
            .then(function(res) {
                var lead = res.body;
                assert.deepEqual(lead.geo.latitude, 37.783);
                assert.deepEqual(lead.geo.longitude, -122.417);
            });
    });
    it('es Savonlinna should have a lead object with a geo property', function() {
        return preq.get({ uri: server.config.uri + 'es.wikipedia.org/v1/page/mobile-sections-lead/Savonlinna' })
            .then(function(res) {
                var lead = res.body;
                assert.deepEqual(lead.geo.latitude, 61.866666666667);
                assert.deepEqual(lead.geo.longitude, 28.883055555556);
            });
    });
    it('es Gogland should not have a lead object with a geo property', function() {
        return preq.get({ uri: server.config.uri + 'es.wikipedia.org/v1/page/mobile-sections-lead/Gogland' })
            .then(function(res) {
                var lead = res.body;
                assert.ok(!lead.hasOwnProperty('geo'));
            });
    });
    it('Barack Obama should have a pronunciation', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-sections-lead/Barack_Obama' })
            .then(function(res) {
                var lead = res.body;
                assert.deepEqual(res.status, 200);
                assert.deepEqual(lead.pronunciation.url, '//upload.wikimedia.org/wikipedia/commons/8/82/En-us-Barack-Hussein-Obama.ogg');
            });
    });
    it('Enwiki Uranus loads successfully (no pronunciation parsing TypeErrors)', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-sections-lead/Uranus' })
            .then(function (res) {
                var lead = res.body;
                assert.deepEqual(res.status, 200);
                assert.deepEqual(lead.pronunciation.url, '//upload.wikimedia.org/wikipedia/commons/1/1c/En-us-Uranus.ogg');
            });
    });
    it('Enwiki Odisha loads successfully (no pronunciation parsing TypeErrors)', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-sections-lead/Odisha' })
            .then(function (res) {
                var lead = res.body;
                assert.deepEqual(res.status, 200);
                assert.deepEqual(lead.pronunciation.url, '//upload.wikimedia.org/wikipedia/commons/c/c2/Pronunciation_of_the_Odia_language_word_%22Odisha%22.ogg');
            });
    });
    it('Enwiki Lead_paragraph_move has the infobox moved after the lead paragraph', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-sections-lead/User:BSitzmann_%28WMF%29%2FMCS%2FTest%2FLead_paragraph_move' })
            .then(function (res) {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.sections[0].text.startsWith('<span><p>Lead paragraph should appear first'),
                    'Expected section text to start with lead paragraph. Actual text ' + res.body.sections[0].text);
            });
    });
});
