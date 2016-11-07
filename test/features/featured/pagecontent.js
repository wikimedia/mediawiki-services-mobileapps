'use strict';

var preq   = require('preq');
var assert = require('../../utils/assert');
var server = require('../../utils/server');
var headers = require('../../utils/headers');
var testUtil = require('../../utils/testUtil');

function nextYear() {
    var result = new Date();
    result.setUTCFullYear(result.getUTCFullYear() + 1);
    return result;
}

var testDate = nextYear();
var dateString = testUtil.constructTestDate(testDate);

describe('featured', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('featured article of a specific date should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wikipedia.org/v1/page/featured/2016/04/15');
    });

    it('featured article of 4/15/2016 should have expected properties', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/featured/2016/04/15' })
            .then(function(res) {
                assert.status(res, 200);
                assert.ok(res.headers.etag.indexOf('50089449') == 0);
                assert.equal(res.body.$merge, 'https://en.wikipedia.org/api/rest_v1/page/summary/Cosmic_Stories_and_Stirring_Science_Stories');
            });
    });

    it('featured article of 4/29/2016 should have a description', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/featured/2016/04/29' })
            .then(function(res) {
                assert.status(res, 200);
                assert.ok(res.headers.etag.indexOf('50282338') == 0);
                assert.equal(res.body.$merge, 'https://en.wikipedia.org/api/rest_v1/page/summary/Lightning_(Final_Fantasy)');
            });
    });

    it('incomplete date should return 404', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/featured/2016/04' })
            .then(function(res) {
                throw new Error('Expected an error, but got status: ' + res.status);
            }, function(err) {
                assert.status(err, 404);
            });
    });

    it('extra uri path parameter after date should return 404', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/featured/2016/04/15/11' })
            .then(function(res) {
                throw new Error('Expected an error, but got status: ' + res.status);
            }, function(err) {
                assert.status(err, 404);
            });
    });

    it('unsupported language', function() {
        return preq.get({ uri: server.config.uri + 'fr.wikipedia.org/v1/page/featured/2016/04/15' })
            .then(function(res) {
                throw new Error('Expected an error, but got status: ' + res.status);
            }, function(err) {
                assert.status(err, 501);
                assert.equal(err.body.type, 'unsupported_language');
            });
    });

    it('unsupported language with aggregated=true should return 204', function() {
        return preq.get({
            uri: server.config.uri + 'zh.wikipedia.org/v1/page/featured/2016/04/15',
            query: { aggregated: true }
        })
        .then(function(res) {
            assert.status(res, 204);
            assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
        });
    });

    it('Missing TFA should return 404', function() {
        return preq.get({
            uri: server.config.uri + 'en.wikipedia.org/v1/page/featured/' + dateString
        })
        .then(function(res) {
            assert.fails('This should fail!');
        }, function(err) {
            assert.status(err, 404);
        });
    });

    it('Missing TFA with aggregated=true should return 204', function() {
        return preq.get({
            uri: server.config.uri + 'en.wikipedia.org/v1/page/featured/' + dateString,
            query: { aggregated: true }
        })
        .then(function(res) {
            assert.status(res, 204);
            assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
        }, function(err) {
            assert.fails('Should not propagate error when aggregated=true!');
        });
    });

    it('featured article of an old date should return 404', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/featured/1970/12/31' })
            .then(function(res) {
                throw new Error('Expected an error, but got status: ' + res.status);
            }, function(err) {
                assert.status(err, 404);
                assert.equal(err.body.type, 'not_found');
            });
    });
});
