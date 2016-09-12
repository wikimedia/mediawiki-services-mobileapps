'use strict';

var assert = require('../../utils/assert.js');
var preq   = require('preq');
var server = require('../../utils/server.js');
var headers = require('../../utils/headers.js');

describe('featured-image', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('featured image of a specific date should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wikipedia.org/v1/media/image/featured/2016/04/15',
            'application/json');
    });

    it('featured image of 4/15/2016 should have expected properties', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/media/image/featured/2016/04/15' })
            .then(function(res) {
                assert.status(res, 200);
                // the page id should be stable but not the revision:
                assert.ok(res.headers.etag.indexOf('42184395/') == 0);
                assert.equal(res.body.title, 'File:Iglesia de La Compañía, Quito, Ecuador, 2015-07-22, DD 116-118 HDR.JPG');
                assert.equal(res.body.thumbnail.source, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Iglesia_de_La_Compa%C3%B1%C3%ADa%2C_Quito%2C_Ecuador%2C_2015-07-22%2C_DD_116-118_HDR.JPG/640px-Iglesia_de_La_Compa%C3%B1%C3%ADa%2C_Quito%2C_Ecuador%2C_2015-07-22%2C_DD_116-118_HDR.JPG');
                assert.equal(res.body.image.source, 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Iglesia_de_La_Compa%C3%B1%C3%ADa%2C_Quito%2C_Ecuador%2C_2015-07-22%2C_DD_116-118_HDR.JPG');
                assert.ok(res.body.description.text.indexOf('Main altar') >= 0);
                assert.equal(res.body.description.lang, 'en');
            });
    });

    it('featured image of 5/23/2016 (no extmetadata) should load successfully and have expected properties', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/media/image/featured/2016/05/23' })
            .then(function(res) {
                assert.status(res, 200);
                assert.equal(res.body.title, 'File:Fra et romersk osteria.jpg');
                assert.equal(res.body.thumbnail.source, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Fra_et_romersk_osteria.jpg/640px-Fra_et_romersk_osteria.jpg');
                assert.equal(res.body.image.source, 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Fra_et_romersk_osteria.jpg');
                assert.ok(!res.body.hasOwnProperty('description'));
            });
    });

    it('incomplete date should return 404', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/media/image/featured/2016/04' })
            .then(function(res) {
                throw new Error('Expected an error, but got status: ' + res.status);
            }, function(err) {
                assert.status(err, 404);
            });
    });

    it('extra uri path parameter after date should return 404', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/media/image/featured/2016/04/15/11' })
            .then(function(res) {
                throw new Error('Expected an error, but got status: ' + res.status);
            }, function(err) {
                assert.status(err, 404);
            });
    });

    it('should return english description where unavailable in request language', function() {
        return preq.get({ uri: server.config.uri + 'fr.wikipedia.org/v1/media/image/featured/2016/04/15' })
            .then(function(res) {
                assert.ok(res.body.description.text.indexOf('Main altar') >= 0);
                assert.equal(res.body.description.lang, 'en');
            });
    });

    it('should return no description when unavailable', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/media/image/featured/2016/06/15' })
            .then(function(res) {
                assert.notProperty(res.body, 'description');
            });
    });

    it('featured image of an old date should return 404', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/media/image/featured/1970/12/31' })
            .then(function(res) {
                throw new Error('Expected an error, but got status: ' + res.status);
            }, function(err) {
                assert.status(err, 404);
                assert.equal(err.body.type, 'not_found');
            });
    });

    it('404 for date with no featured image should be suppressed when aggregated flag is set', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/media/image/featured/2002/09/12',
                          query: { aggregated: true }})
          .then(function(res) {
              assert.status(res, 200);
              assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
          });
    });
});
