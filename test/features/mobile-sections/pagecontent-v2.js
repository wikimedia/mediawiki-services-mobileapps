'use strict';

var assert = require('../../utils/assert.js');
var preq   = require('preq');
var server = require('../../utils/server.js');

describe('mobile-sections-v2', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('Hatnotes do not appear in the lead object', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/formatted-lead/Chivalric%20order' })
            .then(function (res) {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.hatnotes[0],
                    'See also: <a href="/wiki/Military_order_(society)" title=\"Military order (society)">Military order (society)</a>',
                     'hatnote property should be present on lead.');
                assert.ok(res.body.sections[0].text.indexOf('<div class="hatnote">') === -1,
                     'Hatnote should not appear in lead section html.' );
            });
    });
    it('Enwiki Barack Obama page has an infobox', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/formatted-lead/Barack_Obama' })
            .then(function (res) {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.infobox !== undefined);
                assert.ok(res.body.sections[0].text.indexOf('"infobox') === -1,
                  'The infobox is removed in version 2 of the api.');
            });
    });
});
