'use strict';

var preq = require('preq');
var assert = require('../../utils/assert');
var mUtil = require('../../../lib/mobile-util');
var server = require('../../utils/server');
var headers = require('../../utils/headers');
var dateUtil = require('../../../lib/dateUtil');
var BLACKLIST = require('../../../etc/feed/blacklist');

var date = new Date();
var originalDate = date.getDate();
date.setDate(originalDate - 5);
var dateString = date.getUTCFullYear() + '/' + dateUtil.pad(date.getUTCMonth() + 1) + '/' + dateUtil.pad(date.getUTCDate());
date.setDate(originalDate + 5);
var futureDateString = date.getUTCFullYear() + '/' + dateUtil.pad(date.getUTCMonth() + 1) + '/' + dateUtil.pad(date.getUTCDate());

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

    it('404 for future date should be suppressed when aggregated flag is set', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/most-read/' + futureDateString,
                          query: { aggregated: true }})
          .then(function(res) {
              assert.status(res, 200);
              assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
          });
    });
});
