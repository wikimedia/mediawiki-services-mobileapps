'use strict';

// mocha defines to avoid JSHint breakage
/* global describe, it, before, beforeEach, after, afterEach */

var assert = require('../../utils/assert.js');
var preq   = require('preq');
var server = require('../../utils/server.js');
var headers = require('../../utils/headers.js');

describe('mobile-text', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'test.wikipedia.org/v1/page/mobile-text/Test',
            'application/json');
    });
    it('should have the right meta fields in the JSON response', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-text/Test' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                assert.notDeepEqual(res.body.lastmodified, undefined);
                assert.notDeepEqual(res.body.revision, undefined);
                assert.notDeepEqual(res.body.languagecount, undefined);
                assert.notDeepEqual(res.body.id, undefined);
                assert.notDeepEqual(res.body.protection, undefined);
                assert.notDeepEqual(res.body.editable, undefined);
                assert.deepEqual(res.body.displaytitle, 'Test');
            });
    });
    it('should have the right structure of section objects', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-text/Test' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                assert.notDeepEqual(res.body.sections, undefined);
                for (var i = 0; i < res.body.sections.length; i++) {
                    assert.notDeepEqual(res.body.sections[i].id, undefined);
                    assert.notDeepEqual(res.body.sections[i].items, undefined);
                }
            });
    });
    it('should have the right structure of paragraph, image, and video objects', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-text/LiteTest' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                var numParagraphs = 0;
                var numImages = 0;
                var numVideos = 0;
                for (var i = 0; i < res.body.sections.length; i++) {
                    var section = res.body.sections[i];
                    for (var j = 0; j < section.items.length; j++) {
                        var item = section.items[j];
                        if (item.type === 'p') {
                            assert.notDeepEqual(item.text, undefined);
                            numParagraphs++;
                        } else if (item.type === 'image') {
                            assert.notDeepEqual(item.src, undefined);
                            assert.notDeepEqual(item.name, undefined);
                            numImages++;
                        } else if (item.type === 'video') {
                            assert.notDeepEqual(item.src, undefined);
                            assert.notDeepEqual(item.name, undefined);
                            numVideos++;
                        }
                    }
                }
                assert.notDeepEqual(numParagraphs, 0);
                assert.notDeepEqual(numImages, 0);
                assert.notDeepEqual(numVideos, 0);
            });
    });
});
