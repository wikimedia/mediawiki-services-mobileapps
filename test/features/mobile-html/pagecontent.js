'use strict';

// mocha defines to avoid JSHint breakage
/* global describe, it, before, beforeEach, after, afterEach */

var assert = require('../../utils/assert.js');
var domino = require('domino');
var preq   = require('preq');
var server = require('../../utils/server.js');

describe('mobile-html', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-html/Test' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                assert.contentType(res, 'text/html');
                assert.deepEqual(res.headers['content-type'], 'text/html; charset=utf-8');
                assert.deepEqual(res.headers['access-control-allow-origin'], '*');
                assert.deepEqual(res.headers['access-control-allow-headers'], 'Accept, X-Requested-With, Content-Type');
                assert.deepEqual(res.headers['content-security-policy'],
                    "default-src 'self'; object-src 'none'; media-src *; img-src *; style-src *; frame-ancestors 'self'");
                assert.deepEqual(res.headers['x-content-security-policy'],
                    "default-src 'self'; object-src 'none'; media-src *; img-src *; style-src *; frame-ancestors 'self'");
                assert.deepEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
            });
    });
    it('should have right tags in HTML head', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-html/Test' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                var doc = domino.createDocument(res.body);
                assert.selectorExistsOnce(doc, 'head script[src="/static/bundle.js"]');
                assert.selectorExistsOnce(doc, 'head link[type="text/css"][href="/static/styles.css"]');
                assert.selectorExistsOnce(doc, 'head meta[name="viewport"]');
            });
    });
    it('should have script tags with embedded JSON', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-html/Test' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                var doc = domino.createDocument(res.body);
                assert.selectorExistsOnce(doc, 'script[type="application/json"][id="mw-app-meta1"]');
                assert.selectorContainsValue(doc, 'script[id="mw-app-meta1"]',
                    '"displaytitle":"Test","protection":[],"editable":true,"toc":[{"id":0');

                assert.selectorExistsOnce(doc, 'script[type="application/json"][id="mw-app-meta2"]');
                assert.selectorHasValue(doc, 'script[id="mw-app-meta2"]', '{}',
                    'expect test page to have no gallery info');
            });
    });
    it('test:EditingHelp article should have edit buttons', function() {
        // I copied a version of that page from enwiki to testwiki so it's more stable
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-html/EditingHelp' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                //var doc = domino.createDocument(res.body);
                //
                //assert.selectorHasValue(doc, 'h2#Editing_articles.section_heading', 'Editing articles',
                //    'expect h2 "Editing articles"');
                //assert.selectorExistsOnce(doc, 'h2#Editing_articles a.edit_section_button',
                //    'expect edit button inside h2');
                //
                //// check all h1, h2, h3, and h4 have an edit button
                //var hNodes = doc.querySelectorAll('h1, h2, h3, h4') || [];
                //var hNodesWithEditButton = doc.querySelectorAll('h1, h2, h3, h4 a.edit_section_button') || [];
                //assert.deepEqual(hNodes.length, hNodesWithEditButton.length)
            });
    });
    it('test:Whatever article should also have some images in gallery', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-html/Whatever' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
            });
    });
    it('test:Main_Page since we have some special handling for main pages', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-html/Main_Page' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
            });
    });
});