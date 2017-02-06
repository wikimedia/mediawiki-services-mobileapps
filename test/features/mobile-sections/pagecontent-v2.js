'use strict';

const assert = require('../../utils/assert.js');
const headers = require('../../utils/headers.js');
const preq   = require('preq');
const server = require('../../utils/server.js');

const enWikiHost = 'en.wikipedia.org/v1';

describe('mobile-sections-v2', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        const uri = `${server.config.uri}${enWikiHost}/page/formatted/Foobar`;
        return headers.checkHeaders(uri);
    });

    it('Supports revision number in request URL', () => {
        const title = '%2Fr%2FThe_Donald';
        const rev = 764101607;
        const uri = `${server.config.uri}${enWikiHost}/page/formatted/${title}/${rev}`;
        return preq.get({ uri })
                   .then((res) => {
                       assert.equal(res.body.lead.revision, rev,
                           'We return the page with requested revision');
                   });
    });

    it('Supports revision number and tid string in request URL', () => {
        const title = '%2Fr%2FThe_Donald';
        const rev = 764101607;
        const tid = 'b24de3d0-ecde-11e6-a863-ed5fc1010eed';
        const uri = `${server.config.uri}${enWikiHost}/page/formatted/${title}/${rev}/${tid}`;
        return preq.get({ uri })
                   .then((res) => {
                       assert.equal(res.body.lead.revision, rev,
                           'We return the page with requested revision and tid');
                   });
    });

    it.skip('Hatnotes do not appear in the lead object', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/formatted/Chivalric%20order`;
        const anchor = '<a href="/wiki/Military_order_(society)" title="Military order (society)">';
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.lead.hatnotes[0],
                    `See also: ${anchor}Military order (society)</a>`,
                     'hatnote property should be present on lead.');
                assert.ok(res.body.lead.text.indexOf('<div class="hatnote">') === -1,
                     'Hatnote should not appear in lead section html.');
            });
    });

    it('Pages with only one section do not have an infobox or intro', () => {
        const title = 'Wikipedia:Today\'s%20featured%20article%2FNovember%207,%202016';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/formatted/${title}`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.lead.infobox === undefined);
                assert.ok(res.body.lead.intro === undefined);
            });
    });

    it('Main pages do not have an infobox or intro', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/formatted/Main_Page`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.lead.infobox === undefined);
                assert.ok(res.body.lead.intro === undefined);
            });
    });

    it('Enwiki Barack Obama page has an infobox', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/formatted/Barack_Obama`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.lead.infobox !== undefined);
                assert.ok(res.body.lead.text.indexOf('"infobox') === -1,
                  'The infobox is removed in version 2 of the api.');
            });
    });

    it('Page issues do not appear in the lead', () => {
        const title = `User:Jdlrobson%2Fmcs-tests%2Fissues_bug`;
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/formatted/${title}`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.lead.text.indexOf('ambox-multiple_issues') === -1,
                  'No ambox multiple issues class in response.');
            });
    });

    it('Barack Obama page lead paragraph', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/formatted/`
            + 'Barack_Obama/760534941';
        return preq.get({ uri })
            .then((res) => {
                const intro = res.body.lead.intro;

                assert.deepEqual(res.status, 200);
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
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/formatted/Planet`;
        return preq.get({ uri })
            .then((res) => {
                const intro = res.body.lead.intro;

                assert.deepEqual(res.status, 200);
                assert.ok(intro.indexOf('<p>') > -1, 'intro is html');
                assert.ok(intro.indexOf('stellar remnant') > -1);
                assert.ok(intro.indexOf('</ul>') > -1,
                  'List element is bundled into paragraph');
            });
    });

    it('Page with IPA content', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/formatted/Sunderland_A.F.C.`;
        return preq.get({ uri })
            .then((res) => {
                const text = res.body.lead.intro;
                const expected = '<span class="nowrap mcs-ipa"><span class="noexcerpt">';
                assert.ok(text.indexOf(expected) > -1, 'mcs-ipa class is found');
            });
    });
});
