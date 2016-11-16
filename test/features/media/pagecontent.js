'use strict';

const assert = require('../../utils/assert.js');
const preq   = require('preq');
const server = require('../../utils/server.js');
const headers = require('../../utils/headers.js');

describe('media', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    function checkItemHasExpectedProperties(item) {
        assert.ok(item.title.indexOf('File:') === 0, 'Expected title to start with "File:"');
        assert.ok(item.url.indexOf('https://upload.wikimedia.org/') === 0, 'Expected url to start with certain text');
    }

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wikipedia.org/v1/page/media/Foobar');
    });

    it('return the sent ETag', function() {
        return preq.get({
            uri: server.config.uri + 'en.wikipedia.org/v1/page/media/Foobar',
            headers: { 'x-restbase-etag': '123456/c3421381-7109-11e5-ac43-8c7f067c3520' }
        }).then(function(res) {
            assert.status(res, 200);
            assert.deepEqual(res.headers.etag, '123456/c3421381-7109-11e5-ac43-8c7f067c3520');
        });
    });

    it('Sections/deep page should have no media items', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/media/Sections%2Fdeep' })
            .then(function(res) {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(!!res.body.items, false, 'Expected no media items');
            });
    });
    it('en Main page should have at least one image', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/media/Main_Page' })
            .then(function(res) {
                assert.ok(res.body.items.length > 0, 'Expected at least one media item');
            });
    });
    it('Obama (redirect) should have a lead image, expected properties, and many media items', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/media/Obama' })
            .then(function(res) {
                const items = res.body.items;
                assert.deepEqual(res.status, 200);
                assert.ok(items.length > 3, 'Expected many media items');
                checkItemHasExpectedProperties(items[0]);
            });
    });
    it('Missing title should respond with 404', function() {
        return preq.get({ uri: server.config.uri + 'test.wikipedia.org/v1/page/media/weoiuyrxcmxn' })
            .then(function() {
                assert.fail("expected an exception to be thrown");
            }).catch(function(res) {
                assert.deepEqual(res.status, 404);
            });
    });
});
