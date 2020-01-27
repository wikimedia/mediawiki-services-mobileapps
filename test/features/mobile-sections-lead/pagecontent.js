'use strict';

const assert = require('../../utils/assert.js');
const preq   = require('preq');
const server = require('../../utils/server.js');

const wikiSectionsLead = 'en.wikipedia.org/v1/page/mobile-sections-lead/';

describe('mobile-sections-lead', function() {

    this.timeout(20000);

    before(() => server.start());

    it('Sections/deep page should have a lead object with expected properties', () => {
        const title = 'Sections%2Fdeep';
        const uri = `${server.config.uri}test.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                const lastMod = lead.lastmodified;
                const prot = lead.protection;
                assert.equal(res.status, 200);
                assert.ok(lastMod.startsWith('20'), `${lastMod} should start with 20`); // 2015-
                assert.equal(lead.displaytitle, 'Sections/deep');
                assert.ok(prot.constructor === Object, 'lead.protection should be an Object');
                assert.ok(!Object.keys(lead.protection).length, 'Page should not be protected');
                assert.equal(lead.editable, true);
                assert.ok(lead.sections.length >= 6, 'Expected at least six section elements');
                assert.equal(lead.sections[0].id, 0);
                assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');
            });
    });
    it('en San Francisco should have a lead object with a geo property', () => {
        const title = 'San_Francisco';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.equal(lead.geo.latitude, 37.7775);
                assert.equal(lead.geo.longitude, -122.41638889);
            });
    });
    it('es Savonlinna should have a lead object with a geo property', () => {
        const uri = `${server.config.uri}es.wikipedia.org/v1/page/mobile-sections-lead/Savonlinna`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.equal(lead.geo.latitude, 61.86666667);
                assert.equal(lead.geo.longitude, 28.88305556);
            });
    });
    it('Wikivoyage en Paris should have a lead object with a geo property', () => {
        const uri = `${server.config.uri}en.wikivoyage.org/v1/page/mobile-sections-lead/Paris`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.equal(lead.geo.latitude, 48.856);
                assert.equal(lead.geo.longitude, 2.351);
            });
    });
    it('es Gogland should not have a lead object with a geo property', () => {
        const uri = `${server.config.uri}es.wikipedia.org/v1/page/mobile-sections-lead/Gogland`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.ok(!{}.hasOwnProperty.call(lead, 'geo'));
            });
    });
    it('Mare Tranquillitatis (lunar sea) should not have a geo property', () => {
        const uri = `${server.config.uri}es.wikipedia.org/v1/page/mobile-sections-lead/Mare Tranquillitatis`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.ok(!{}.hasOwnProperty.call(lead, 'geo'));
            });
    });
    it('Barack Obama should have a pronunciation', () => {
        const title = 'Barack_Obama';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        const exp = '//upload.wikimedia.org/wikipedia/commons/8/82/En-us-Barack-Hussein-Obama.ogg';
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.equal(res.status, 200);
                assert.equal(lead.pronunciation.url, exp);
            });
    });
    it('Barack Obama infobox is part of the html', () => {
        const title = 'Barack_Obama';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
            .then((res) => {
                assert.ok(res.body.sections[0].text.indexOf('"infobox') > -1,
                    'The infobox has not been removed for backwards compatibility.');
            });
    });
    it('Enwiki Uranus loads successfully (no pronunciation parsing TypeErrors)', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/Uranus`;
        const exp = '//upload.wikimedia.org/wikipedia/commons/7/71/En-us-Uranus%282%29.oga';
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.equal(res.status, 200);
                assert.equal(lead.pronunciation.url, exp);
            });
    });
    // Skip until a long term solution for https://phabricator.wikimedia.org/T214338 is found
    it.skip('Enwiki Odisha loads successfully (no pronunciation parsing TypeErrors)', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/Odisha`;
        const path = '//upload.wikimedia.org/wikipedia/commons/c/c2';
        const exp = `${path}/Pronunciation_of_the_Odia_language_word_%22Odisha%22.ogg`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.equal(res.status, 200);
                assert.equal(lead.pronunciation.url, exp);
            });
    });
    it('Enwiki Yazidis loads successfully (no pronunciation parsing TypeErrors)', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/Yazidis`;
        const path = '//upload.wikimedia.org/wikipedia/commons/8/8d';
        const exp = `${path}/En-us-Yazidis_from_Iraq_pronunciation_%28Voice_of_America%29.ogg`;
        return preq.get({ uri })
                   .then((res) => {
                       const lead = res.body;
                       assert.equal(res.status, 200);
                       assert.equal(lead.pronunciation.url, exp);
                   });
    });
    it("' in pronunciation file name does not cause parsing error)", () => {
        const title = '%D8%A2%D8%A6%DB%8C%D9%88%D8%B1%DB%8C_%DA%A9%D9%88%D8%B3%D9%B9';
        const uri = `${server.config.uri}ur.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
                   .then((res) => {
                       assert.equal(res.status, 200);
                   });
    });
    it('Enwiki Lead_paragraph_move has the infobox moved after the lead paragraph', () => {
        const title = 'User:BSitzmann_%28WMF%29%2FMCS%2FTest%2FLead_paragraph_move';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        const regex = /<p>Lead paragraph should appear first/;
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.ok(regex.test(res.body.sections[0].text),
                    `Expected section text to start with lead paragraph.
                    Actual text ${res.body.sections[0].text}`);
            });
    });
    it('Enwiki hatnotes are promoted to the lead object', () => {
        const title = 'Order_of_chivalry';
        const uri = `${server.config.uri}${wikiSectionsLead}${title}/699553745`;
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.ok(res.body.hatnotes[0], 'hatnote property present on lead.');
                assert.ok(res.body.sections[0].text.indexOf('See also:') > -1,
                    'Hatnote is repeated in text for backwards compatibility.');
            });
    });
    it('Enwiki Multiple page issues are promoted to lead', () => {
        const title = 'User:Jdlrobson%2Fmcs-tests%2Fissues_bug';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.equal(res.body.issues.length, 2,
                    '2 issues are found in the page. Multiple issues heading is skipped.');
                assert.ok(res.body.sections[0].text.indexOf('ambox-multiple_issues') > -1,
                    'The ambox multiple issues class is preserved in the response.');
            });
    });
    it('Enwiki Pages with single issue have issue promoted to lead', () => {
        const title = 'User:Jdlrobson%2Fmcs-tests%2Fissues_bug_3';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.ok(res.body.issues.length === 1,
                    '1 issue was found on this page.');
                assert.ok(res.body.sections[0].text.indexOf('"ambox') === -1,
                    'No ambox issues class in response.');
            });
    });
    it('Disambiguation pages are flagged.', () => {
        const title = 'Barack_(disambiguation)';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.ok(res.body.disambiguation,
                    'Disambiguation flag is present in meta data.');
            });
    });
    it('Content model present in response for non-wikitext content', () => {
        const title = 'Schema:RelatedArticles';
        const uri = `${server.config.uri}meta.wikimedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.ok(res.body.contentmodel === 'JsonSchema',
                    'Article flagged as a JsonSchema.');
            });
    });
});
