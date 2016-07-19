'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert');
var server = require('../../utils/server');
var headers = require('../../utils/headers');
var dateUtil = require('../../../lib/dateUtil');

var date = new Date();
var dateString = date.getUTCFullYear() + '/' + dateUtil.pad(date.getUTCMonth() + 1) + '/' + dateUtil.pad(date.getUTCDate());

var yesterday = new Date(Date.now() - dateUtil.ONE_DAY);
var yesterdayString = yesterday.getUTCFullYear() + '-'
                    + dateUtil.pad(yesterday.getUTCMonth() + 1) + '-'
                    + dateUtil.pad(yesterday.getUTCDate())
                    + 'Z';

describe('aggregated feed endpoint', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wikipedia.org/v1/feed/featured/' + dateString);
    });

    it('Response should contain all expected properties', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/feed/featured/' + dateString })
            .then(function(res) {
                var body = res.body;
                assert.deepEqual(res.status, 200);
                assert.ok(body.hasOwnProperty('tfa'), 'Should have today\'s featured article');
                if (body.hasOwnProperty('mostread')) {
                      assert.ok(body.mostread.articles.length, 'Should have most-read articles');
                      assert.deepEqual(body.mostread.date, yesterdayString);
                }
                assert.ok(body.hasOwnProperty('random'), 'Should have random article');
                assert.ok(body.hasOwnProperty('news'), 'Should have today\'s news');
                assert.ok(body.hasOwnProperty('image'), 'Should have today\'s featured image');
            });
    });

    it('non-enwiki doesn\'t have tfa or news entries', function() {
        return preq.get({ uri: server.config.uri + 'fr.wikipedia.org/v1/feed/featured/' + dateString })
            .then(function(res) {
                var body = res.body;
                assert.deepEqual(res.status, 200);
                assert.ok(!body.hasOwnProperty('tfa'), 'Should not have today\'s featured article');
                assert.ok(!body.hasOwnProperty('news'), 'Should not have today\'s news');
                if (body.hasOwnProperty('mostread')) {
                      assert.ok(body.mostread.articles.length, 'Should have most-read articles');
                }
                assert.ok(body.hasOwnProperty('random'), 'Should have random article');
                assert.ok(body.hasOwnProperty('image'), 'Should have today\'s featured image');
            });
    });

    it('featured image for 2016/07/05 has expected properties', function() {
        return preq.get({ uri: server.config.uri + 'ja.wikipedia.org/v1/feed/featured/2016/07/05' })
            .then(function(res) {
                var image = res.body.image;
                assert.deepEqual(res.status, 200);
                assert.ok(image, 'Should have today\'s featured image');
                assert.deepEqual(image.title, 'File:Amari Agia Anna Fresco 02.JPG');
                assert.deepEqual(image.thumbnail.source, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Amari_Agia_Anna_Fresco_02.JPG/640px-Amari_Agia_Anna_Fresco_02.JPG');
                assert.deepEqual(image.image.source, 'https://upload.wikimedia.org/wikipedia/commons/6/64/Amari_Agia_Anna_Fresco_02.JPG');
                assert.deepEqual(image.description.text, 'Byzantine fresco of Saint Andrew of Crete in the church of Agia Anna (Αγία Άννα), Amari Valley, Crete. The frescoes are dated 1225 and the oldest dated frescoes in Crete.');
                assert.deepEqual(image.description.lang, 'en');
            });
    });
});
