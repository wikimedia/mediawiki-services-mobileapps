'use strict';

var assert = require('../../utils/assert.js');
var preq   = require('preq');
var server = require('../../utils/server.js');
var headers = require('../../utils/headers.js');

describe('featured', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('featured article of a specific date should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wikipedia.org/v1/page/featured/2016/04/15',
            'application/json');
    });

    it('featured article of 4/15/2016 should have title "Cosmic Stories and Stirring Science Stories"', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/featured/2016/04/15' })
            .then(function(res) {
                assert.status(res, 200);
                // the page id should be stable but not the revision:
                assert.ok(res.headers.etag.indexOf('50089449/') == 0);
                assert.equal(res.body.page.title, 'Cosmic Stories and Stirring Science Stories');
                assert.equal(res.body.page.thumbnail['60'], 'http://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Cosmic_Science-Fiction_May_1941.jpg/60px-Cosmic_Science-Fiction_May_1941.jpg');
                assert.equal(res.body.page.thumbnail['120'], 'http://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Cosmic_Science-Fiction_May_1941.jpg/120px-Cosmic_Science-Fiction_May_1941.jpg');
                assert.equal(res.body.page.thumbnail['320'], 'http://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Cosmic_Science-Fiction_May_1941.jpg/226px-Cosmic_Science-Fiction_May_1941.jpg');
                assert.ok(res.body.page.extract.indexOf('Cosmic Stories ') >= 0);
            });
    });

    it('featured article of 4/29/2016 should have a description', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/featured/2016/04/29' })
            .then(function(res) {
                assert.status(res, 200);
                // the page id should be stable but not the revision:
                assert.ok(res.headers.etag.indexOf('50282338/') == 0);
                assert.equal(res.body.page.title, 'Lightning (Final Fantasy)');
                assert.ok(res.body.page.description.indexOf('Final Fantasy') >= 0);
                assert.ok(res.body.page.extract.indexOf('Lightning ') >= 0);
            });
    });

    it('incomplete date should return 404', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/featured/2016/04' })
            .then(function(res) {
            }, function(err) {
                assert.status(err, 404);
            });
    });

    it('extra uri path parameter after date should return 404', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/featured/2016/04/15/11' })
            .then(function(res) {
            }, function(err) {
                assert.status(err, 404);
            });
    });

    it('unsupported language', function() {
        return preq.get({ uri: server.config.uri + 'fr.wikipedia.org/v1/page/featured/2016/04/15' })
            .then(function(res) {
            }, function(err) {
                assert.status(err, 501);
                assert.equal(err.body.type, 'unsupported_language');
            });
    });

    it('featured article of an old date should return 404', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/featured/1970/12/31' })
            .then(function(res) {
            }, function(err) {
                assert.status(err, 404);
                assert.equal(err.body.type, 'not_found');
            });
    });
});
