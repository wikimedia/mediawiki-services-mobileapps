'use strict';

var assert = require('../../utils/assert.js');
var preq   = require('preq');
var server = require('../../utils/server.js');
var headers = require('../../utils/headers.js');

describe('mobile-summary', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wikipedia.org/v1/page/mobile-summary/Foobar',
            'application/json');
    });
    it('Page should have expected properties', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/mobile-summary/Ann_Arbor_Charter_Township,_Michigan' })
            .then(function(res) {
                var body = res.body;
                assert.deepEqual(res.status, 200);
                assert.deepEqual(body.title, 'Ann Arbor Charter Township, Michigan');
                assert.ok(body.extract.indexOf('Ann Arbor Charter Township is a charter township') === 0, 'Expected different start of extract');
                assert.deepEqual(body.thumbnail, {
                    "source": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Ann_Arbor_Township_hall_and_fire_station.JPG/320px-Ann_Arbor_Township_hall_and_fire_station.JPG"
                });
            });
    });
});
