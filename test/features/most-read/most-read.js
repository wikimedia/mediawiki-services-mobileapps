'use strict';

const preq = require('preq');
const assert = require('../../utils/assert');
const server = require('../../utils/server');
const headers = require('../../utils/headers');
const testUtil = require('../../utils/testUtil');

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

const date = new Date();
const beforeDate = addDays(date, -5);
const dateString = testUtil.constructTestDate(beforeDate);
const afterDate = addDays(date, 5);
const futureDateString = testUtil.constructTestDate(afterDate);

describe('most-read articles', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wikipedia.org/v1/page/most-read/' + dateString);
    });

    it('results list should have expected properties', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/most-read/' + dateString })
          .then(function(res) {
            assert.deepEqual(res.status, 200);
            assert.ok(res.body.date);
            assert.ok(res.body.articles.length);
            res.body.articles.forEach(function (elem) {
                assert.ok(elem.$merge, '$merge should be present');
            });
        });
    });

    it('should load successfully even with no normalizations from the MW API', function() {
        return preq.get({ uri: server.config.uri + 'ja.wikipedia.org/v1/page/most-read/2016/06/15' })
          .then(function(res) {
            assert.deepEqual(res.status, 200);
            assert.ok(res.body.date);
            assert.ok(res.body.articles.length);
            res.body.articles.forEach(function (elem) {
                assert.ok(elem.$merge, '$merge should be present');
            });
        });
    });

    it('Request to mobile domain should complete successfully', function() {
        return preq.get({ uri: server.config.uri + 'en.m.wikipedia.org/v1/page/most-read/' + dateString })
          .then(function(res) {
            assert.deepEqual(res.status, 200);
        });
    });

    it('Request for future date should return 204 when aggregated flag is set', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/most-read/' + futureDateString,
                        query: { aggregated: true }})
          .then(function(res) {
            assert.status(res, 204);
            assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
        });
    });

    it('Should throw 404 for request with no results', function() {
        return preq.get({ uri: server.config.uri + 'zh-classical.wikipedia.org/v1/page/most-read/2016/11/12' })
            .then(function(res) {
                throw new Error('Expected an error, but got status: ' + res.status);
            }), function(err) {
                assert.status(err, 404);
            };
    });

    it('Should return 204 for request with no results, aggregated=true', function() {
        return preq.get({ uri: server.config.uri + 'zh-classical.wikipedia.org/v1/page/most-read/2016/11/12',
                        query: { aggregated: true }})
            .then(function(res) {
                assert.status(res, 204);
                assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
            });
    });
});
