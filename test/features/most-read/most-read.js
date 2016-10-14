'use strict';

var preq = require('preq');
var assert = require('../../utils/assert');
var mUtil = require('../../../lib/mobile-util');
var server = require('../../utils/server');
var headers = require('../../utils/headers');
var dateUtil = require('../../../lib/dateUtil');
var BLACKLIST = require('../../../etc/feed/blacklist');

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

var date = new Date();
var beforeDate = addDays(date, -5);
var dateString = beforeDate.getUTCFullYear() + '/' + dateUtil.pad(beforeDate.getUTCMonth() + 1) + '/' + dateUtil.pad(beforeDate.getUTCDate());
var afterDate = addDays(date, 5);
var futureDateString = afterDate.getUTCFullYear() + '/' + dateUtil.pad(afterDate.getUTCMonth() + 1) + '/' + dateUtil.pad(afterDate.getUTCDate());

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
                assert.ok(elem.title, 'title should be present');
                assert.ok(BLACKLIST.indexOf(elem.title) === -1, 'Should not include blacklisted title');
                assert.ok(elem.title !== 'Main_Page', 'Should not include the Main Page');
                assert.ok(elem.title.indexOf('Special:') === -1, 'Should not include Special page');
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
                assert.ok(elem.title, 'title should be present');
                assert.ok(BLACKLIST.indexOf(elem.title) === -1, 'Should not include blacklisted title');
                assert.ok(elem.title !== 'Main_Page', 'Should not include the Main Page');
                assert.ok(elem.title.indexOf('Special:') === -1, 'Should not include Special page');
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
});
