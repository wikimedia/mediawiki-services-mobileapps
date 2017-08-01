'use strict';

const assert = require('../../utils/assert.js');
const preq = require('preq');
const server = require('../../utils/server.js');
const shared = require('./shared.js');

describe('mobile-sections-v2', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    const localUri = (title, domain = 'en.wikipedia.org') => {
        return `${server.config.uri}${domain}/v1/page/formatted/${title}`;
    };

    shared.shouldBehaveLikeMobileSections(localUri);

    // slightly different

    it('Page with IPA content', () => {
        const title = 'Sunderland_A.F.C./738562635';
        const uri = localUri(title);
        return preq.get({ uri })
        .then((res) => {
            const text = res.body.lead.intro;
            const regex = /<span class="nowrap mcs-ipa">/;
            assert.ok(regex.test(text), `mcs-ipa class should be in ${text}`);
        });
    });

    // special

    it('Hatnotes do not appear in the lead object', () => {
        const title = 'Chivalric%20order/699553745';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/formatted/${title}`;
        const anchor = '<a href="/wiki/Military_order_(society)" title="Military order (society)">';
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.ok(res.body.lead.hatnotes[0],
                    `See also: ${anchor}Military order (society)</a>`,
                     'hatnote property should be present on lead.');
                assert.ok(res.body.lead.text.indexOf('<div class="hatnote">') === -1,
                     'Hatnote should not appear in lead section html.');
            });
    });

    it('Page issues do not appear in the lead', () => {
        const title = `User:Jdlrobson%2Fmcs-tests%2Fissues_bug`;
        const uri = localUri(title);
        return preq.get({ uri })
        .then((res) => {
            assert.equal(res.status, 200);
            assert.ok(res.body.lead.text.indexOf('ambox-multiple_issues') === -1,
                'No ambox multiple issues class in response.');
        });
    });

    it('Pages with only one section do not have an infobox or intro', () => {
        const title = 'Wikipedia:Today\'s%20featured%20article%2FNovember%207,%202016';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/formatted/${title}`;
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.ok(res.body.lead.infobox === undefined);
                assert.ok(res.body.lead.intro === undefined);
            });
    });

    it('Main pages do not have an infobox or intro', () => {
        const uri = localUri('Main_Page');
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.ok(res.body.lead.infobox === undefined);
                assert.ok(res.body.lead.intro === undefined);
            });
    });

    it('Enwiki Barack Obama page has an infobox', () => {
        const uri = localUri('Barack_Obama');
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.ok(res.body.lead.infobox !== undefined);
                assert.ok(res.body.lead.text.indexOf('"infobox') === -1,
                  'The infobox is removed in version 2 of the api.');
            });
    });

    it('Barack Obama page lead paragraph', () => {
        const uri = localUri('Barack_Obama/760534941');
        return preq.get({ uri })
            .then((res) => {
                const intro = res.body.lead.intro;

                assert.equal(res.status, 200);
                assert.ok(intro !== undefined, 'Intro property present.');
                assert.ok(intro.indexOf('President of the United States') > -1,
                  'Intro does not come from infobox.');
                assert.ok(intro.indexOf('undefined') === -1,
                  'No undefined concatenations');
                assert.ok(res.body.lead.text.indexOf(intro) === -1,
                  'Intro is not present in section text.');
                assert.equal(res.body.lead.wikibase_item, 'Q76');
                assert.ok(res.body.lead.description.indexOf('44th') > -1,
                  'Description is a string and contains "44th"');
            });
    });

    it('Planet introduction contains nodes other than P (T111958)', () => {
        const uri = localUri('Planet');
        return preq.get({ uri })
            .then((res) => {
                const intro = res.body.lead.intro;

                assert.equal(res.status, 200);
                assert.ok(intro.indexOf('<p>') > -1, 'intro is html');
                assert.ok(intro.indexOf('stellar remnant') > -1);
                assert.ok(intro.indexOf('</ul>') > -1,
                  'List element is bundled into paragraph');
            });
    });
});
