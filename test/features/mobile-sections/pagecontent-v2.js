'use strict';

const assert = require('../../utils/assert.js');
const preq   = require('preq');
const server = require('../../utils/server.js');

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
                assert.ok(res.body.text.indexOf('<div class="hatnote">') === -1,
                     'Hatnote should not appear in lead section html.' );
            });
    });

    it('Pages with only one section do not have an infobox or intro', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/formatted-lead/Wikipedia:Today\'s%20featured%20article%2FNovember%207,%202016' })
            .then(function (res) {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.infobox === undefined);
                assert.ok(res.body.intro === undefined);
            });
    });

    it('Main pages do not have an infobox or intro', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/formatted-lead/Main_Page' })
            .then(function (res) {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.infobox === undefined);
                assert.ok(res.body.intro === undefined);
            });
    });

    it('Enwiki Barack Obama page has an infobox', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/formatted-lead/Barack_Obama' })
            .then(function (res) {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.infobox !== undefined);
                assert.ok(res.body.text.indexOf('"infobox') === -1,
                  'The infobox is removed in version 2 of the api.');
            });
    });

    it('Page issues do not appear in the lead', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/formatted-lead/User:Jdlrobson%2Fmcs-tests%2Fissues_bug' })
            .then(function (res) {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.text.indexOf('ambox-multiple_issues') === -1,
                  'No ambox multiple issues class in response.');
            });
    });

    it('Barack Obama page lead paragraph', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/formatted-lead/Barack_Obama' })
            .then(function (res) {
                const intro = res.body.intro;

                assert.deepEqual(res.status, 200);
                assert.ok(intro !== undefined, 'Intro property present.');
                assert.ok(intro.indexOf( 'the first president born outside' ) > -1,
                  'Intro does not come from infobox.');
                assert.ok(intro.indexOf( 'undefined' ) === -1,
                  'No undefined concatenations');
                assert.ok(res.body.text.indexOf(intro) === -1,
                  'Intro is not present in section text.');
            });
    });
    it('Planet introduction contains nodes other than P (T111958)', function() {
        return preq.get({ uri: server.config.uri + 'en.wikipedia.org/v1/page/formatted-lead/Planet' })
            .then(function (res) {
                const intro = res.body.intro;

                assert.deepEqual(res.status, 200);
                assert.ok(intro.indexOf( '<p>' ) > -1, 'intro is html' );
                assert.ok(intro.indexOf( 'stellar remnant' ) > -1 );
                assert.ok(intro.indexOf( '</ul>' ) > -1,
                  'List element is bundled into paragraph');
            });
    });
});
