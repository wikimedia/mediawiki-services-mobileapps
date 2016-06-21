'use strict';

var assert = require('../../utils/assert.js');
var preq   = require('preq');
var server = require('../../utils/server.js');
var headers = require('../../utils/headers.js');

describe('mobile-sections', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wikipedia.org/v1/page/mobile-sections/Foobar');
    });

    it('return the sent ETag', function() {
        return preq.get({
            uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-sections/Foobar',
            headers: { 'x-restbase-etag': '123456/c3421381-7109-11e5-ac43-8c7f067c3520' }
        }).then(function(res) {
            assert.status(res, 200);
            assert.deepEqual(res.headers.etag, '123456/c3421381-7109-11e5-ac43-8c7f067c3520');
        });
    });

    it('Sections/deep page should have a lead object with expected properties', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-sections/Sections%2Fdeep' })
            .then(function(res) {
                var lead = res.body.lead;
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
    it('en Main page should have a lead object with expected properties', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-sections/Main_Page' })
            .then(function(res) {
                var lead = res.body.lead;
                assert.deepEqual(res.status, 200);
                assert.ok(lead.lastmodified.startsWith('201'), lead.lastmodified + ' should start with 201'); // 2015-
                assert.deepEqual(lead.displaytitle, 'Main Page');
                assert.deepEqual(lead.normalizedtitle, 'Main Page');
                assert.ok(/main page/i.test(lead.description));
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
            });
    });
    it('Missing title should respond with 404', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-sections/weoiuyrxcmxn' })
            .then(function() {
                assert.fail("expected an exception to be thrown");
            }).catch(function(res) {
                // Most checks are commented out here because RB seems to behave inconsistently right now.

                //var body = res.body;
                assert.deepEqual(res.status, 404);
                //assert.deepEqual(body.type, 'https://restbase.org/errors/not_found#page_revisions');
                //assert.deepEqual(body.title, 'Not found.');
                //assert.deepEqual(body.detail, 'Page or revision not found.');
            });
    });
    it('Page with known past \'text-decoration\' error should load successfully', function() {
        return preq.get({ uri: server.config.uri + 'zh.wikipedia.org/v1/page/mobile-sections/%E6%9F%A5%E5%85%8B%C2%B7%E8%91%9B%E9%87%8C%E8%8A%AC%E7%B4%8D%E5%A5%87' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
            });
    });
    it('Beta cluster request should load successfully', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.beta.wmflabs.org/v1/page/mobile-sections/Foobar' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
            });
    });
    it('Page with irregular Spoken Wikipedia template usage should load correctly', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-sections/Alliterative_verse' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.lead.spoken.files[0], 'File:En-Alliterative_verse-article.ogg');
            });
    });
    it('Page with HTML entity in redirected page title should load', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-sections/User:BSitzmann_%28WMF%29%2FMCS%2FTest%2FA%26B_redirect' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.lead.normalizedtitle, 'User:BSitzmann (WMF)/MCS/Test/A&B redirect');
                assert.deepEqual(res.body.lead.displaytitle, 'User:BSitzmann (WMF)/MCS/Test/A&B');
                assert.deepEqual(res.body.lead.redirected, 'User:BSitzmann (WMF)/MCS/Test/A&B');
            });
    });
    it('Page with % in redirected page title should load', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.beta.wmflabs.org/v1/page/mobile-sections/User:Pchelolo%2fRedirect_Test' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.lead.normalizedtitle, 'User:Pchelolo/Redirect Test');
                assert.deepEqual(res.body.lead.displaytitle, 'User:Pchelolo/Redirect Target %');
                assert.deepEqual(res.body.lead.redirected, 'User:Pchelolo/Redirect Target %');
            });
    });
    it('Page with % in redirected page title should load 2', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-sections/User:BSitzmann_%28WMF%29%2FMCS%2FTest%2Fredirect_test2' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.lead.normalizedtitle, 'User:BSitzmann (WMF)/MCS/Test/redirect test2');
                assert.deepEqual(res.body.lead.displaytitle, 'User:BSitzmann (WMF)/MCS/Test/redirect test2 target %');
                assert.deepEqual(res.body.lead.redirected, 'User:BSitzmann (WMF)/MCS/Test/redirect test2 target %');
            });
    });
    it('Page with % in section header of redirected page title should load', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/mobile-sections/User:BSitzmann_%28WMF%29%2FMCS%2FTest%2Fredirect_test3' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.lead.normalizedtitle, 'User:BSitzmann (WMF)/MCS/Test/redirect test3');
                assert.deepEqual(res.body.lead.displaytitle, 'User:BSitzmann (WMF)/MCS/Test/redirect test3 target');
                assert.deepEqual(res.body.lead.redirected, 'User:BSitzmann (WMF)/MCS/Test/redirect test3 target#Section_.25');
            });
    });
});
