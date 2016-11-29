'use strict';

const assert = require('../../utils/assert.js');
const preq   = require('preq');
const server = require('../../utils/server.js');

describe('mobile-sections-v2', function() {
    this.timeout(20000);

    before(() => { return server.start(); });

    it.skip('Hatnotes do not appear in the lead object', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/formatted-lead/Chivalric%20order` })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.hatnotes[0],
                    'See also: <a href="/wiki/Military_order_(society)" title=\"Military order (society)">Military order (society)</a>',
                     'hatnote property should be present on lead.');
                assert.ok(res.body.text.indexOf('<div class="hatnote">') === -1,
                     'Hatnote should not appear in lead section html.');
            });
    });

    it('Pages with only one section do not have an infobox or intro', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/formatted-lead/Wikipedia:Today's%20featured%20article%2FNovember%207,%202016` })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.infobox === undefined);
                assert.ok(res.body.intro === undefined);
            });
    });

    it('Main pages do not have an infobox or intro', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/formatted-lead/Main_Page` })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.infobox === undefined);
                assert.ok(res.body.intro === undefined);
            });
    });

    it('Enwiki Barack Obama page has an infobox', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/formatted-lead/Barack_Obama` })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.infobox !== undefined);
                assert.ok(res.body.text.indexOf('"infobox') === -1,
                  'The infobox is removed in version 2 of the api.');
            });
    });

    it('Page issues do not appear in the lead', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/formatted-lead/User:Jdlrobson%2Fmcs-tests%2Fissues_bug` })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.text.indexOf('ambox-multiple_issues') === -1,
                  'No ambox multiple issues class in response.');
            });
    });

    it('Barack Obama page lead paragraph', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/formatted-lead/Barack_Obama` })
            .then((res) => {
                const intro = res.body.intro;

                assert.deepEqual(res.status, 200);
                assert.ok(intro !== undefined, 'Intro property present.');
                assert.ok(intro.indexOf('the first president born outside') > -1,
                  'Intro does not come from infobox.');
                assert.ok(intro.indexOf('undefined') === -1,
                  'No undefined concatenations');
                assert.ok(res.body.text.indexOf(intro) === -1,
                  'Intro is not present in section text.');
                assert.equal(res.body.wikibase_item, 'Q76');
                assert.ok(res.body.description.indexOf('44th') > -1,
                  'Description is a string and contains "44th"');
            });
    });
    it('Planet introduction contains nodes other than P (T111958)', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/formatted-lead/Planet` })
            .then((res) => {
                const intro = res.body.intro;

                assert.deepEqual(res.status, 200);
                assert.ok(intro.indexOf('<p>') > -1, 'intro is html');
                assert.ok(intro.indexOf('stellar remnant') > -1);
                assert.ok(intro.indexOf('</ul>') > -1,
                  'List element is bundled into paragraph');
            });
    });
});
