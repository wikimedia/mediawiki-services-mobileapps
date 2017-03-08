'use strict';

const assert = require('../../utils/assert.js');
const preq   = require('preq');
const server = require('../../utils/server.js');
const headers = require('../../utils/headers.js');

describe('mobile-sections-lead', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/Foobar`;
        return headers.checkHeaders(uri);
    });
    it('Sections/deep page should have a lead object with expected properties', () => {
        const title = `Sections%2Fdeep`;
        const uri = `${server.config.uri}test.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                const lastMod = lead.lastmodified;
                const prot = lead.protection;
                assert.deepEqual(res.status, 200);
                assert.ok(lastMod.startsWith('201'), `${lastMod} should start with 201`); // 2015-
                assert.deepEqual(lead.displaytitle, 'Sections/deep');
                assert.ok(prot.constructor === Object, 'lead.protection should be an Object');
                assert.ok(!Object.keys(lead.protection).length, 'Page should not be protected');
                assert.deepEqual(lead.editable, true);
                assert.ok(lead.sections.length >= 6, 'Expected at least six section elements');
                assert.deepEqual(lead.sections[0].id, 0);
                assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');
            });
    });
    it('en Cat page should have a lead object with expected properties', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/Cat`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                const lastMod = lead.lastmodified;
                const files = lead.spoken.files;
                const path = "//upload.wikimedia.org/wikipedia/commons/thumb/0/0b";
                assert.deepEqual(res.status, 200);
                assert.ok(lastMod.startsWith('201'), `${lastMod} should start with 201`); // 2015-
                assert.deepEqual(lead.displaytitle, 'Cat');
                assert.deepEqual(lead.description, 'species');
                assert.deepEqual(lead.protection, {
                    "edit": [
                        "autoconfirmed"
                    ],
                    "move": [
                        "sysop"
                    ]
                });
                assert.deepEqual(lead.editable, false);
                assert.deepEqual(lead.image, {
                    "file": "Cat poster 1.jpg",
                    "urls": {
                        "320": `${path}/Cat_poster_1.jpg/320px-Cat_poster_1.jpg`,
                        "640": `${path}/Cat_poster_1.jpg/640px-Cat_poster_1.jpg`,
                        "800": `${path}/Cat_poster_1.jpg/800px-Cat_poster_1.jpg`,
                        "1024": `${path}/Cat_poster_1.jpg/1024px-Cat_poster_1.jpg`
                    }
                });
                assert.ok(files.length > 0, 'Expected at least one Spoken Wikipedia audio file');
                assert.ok(files[0].indexOf('.') > -1, 'Expected file extension in spoken filename');
                assert.ok(files[0].indexOf('File:') === 0, 'Expected File namespace in filename');
                assert.ok(lead.sections.length > 0, 'Expected at least one section element');
                assert.deepEqual(lead.sections[0].id, 0);
                assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');
            });
    });
    it('en San Francisco should have a last modifier', () => {
        const title = 'San_Francisco';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.ok(lead.lastmodifier !== undefined);
            });
    });
    it('en San Francisco should have a lead object with a geo property', () => {
        const title = 'San_Francisco';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.deepEqual(lead.geo.latitude, 37.783);
                assert.deepEqual(lead.geo.longitude, -122.417);
            });
    });
    it('en Talk:San Francisco should have a lead object with correct namespace property', () => {
        const title = 'Talk:San_Francisco';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.ok(lead.ns === 1);
            });
    });
    it('en San Francisco should have a lead object with correct namespace property', () => {
        const title = 'San_Francisco';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.ok(lead.ns === 0);
            });
    });
    it('es Savonlinna should have a lead object with a geo property', () => {
        const uri = `${server.config.uri}es.wikipedia.org/v1/page/mobile-sections-lead/Savonlinna`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.deepEqual(lead.geo.latitude, 61.866666666667);
                assert.deepEqual(lead.geo.longitude, 28.883055555556);
            });
    });
    // TODO: FIX OR REMOVE
    it.skip('Wikivoyage en Paris should have a lead object with a geo property', () => {
        const uri = `${server.config.uri}en.wikivoyage.org/v1/page/mobile-sections-lead/Paris`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.deepEqual(lead.geo.latitude, 48.856);
                assert.deepEqual(lead.geo.longitude, 2.351);
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
    it('Barack Obama should have a pronunciation', () => {
        const title = 'Barack_Obama';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        const exp = '//upload.wikimedia.org/wikipedia/commons/8/82/En-us-Barack-Hussein-Obama.ogg';
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.deepEqual(res.status, 200);
                assert.deepEqual(lead.pronunciation.url, exp);
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
        const exp = '//upload.wikimedia.org/wikipedia/commons/1/1c/En-us-Uranus.ogg';
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.deepEqual(res.status, 200);
                assert.deepEqual(lead.pronunciation.url, exp);
            });
    });
    it('Enwiki Odisha loads successfully (no pronunciation parsing TypeErrors)', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/Odisha`;
        const path = `//upload.wikimedia.org/wikipedia/commons/c/c2`;
        const exp = `${path}/Pronunciation_of_the_Odia_language_word_%22Odisha%22.ogg`;
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body;
                assert.deepEqual(res.status, 200);
                assert.deepEqual(lead.pronunciation.url, exp);
            });
    });
    it('Enwiki Yazidis loads successfully (no pronunciation parsing TypeErrors)', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/Yazidis`;
        const path = `//upload.wikimedia.org/wikipedia/commons/8/8d`;
        const exp = `${path}/En-us-Yazidis_from_Iraq_pronunciation_%28Voice_of_America%29.ogg`;
        return preq.get({ uri })
                   .then((res) => {
                       const lead = res.body;
                       assert.deepEqual(res.status, 200);
                       assert.deepEqual(lead.pronunciation.url, exp);
                   });
    });
    it('\' in pronunciation file name does not cause parsing error)', () => {
        const title = '%D8%A2%D8%A6%DB%8C%D9%88%D8%B1%DB%8C_%DA%A9%D9%88%D8%B3%D9%B9';
        const uri = `${server.config.uri}ur.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
                   .then((res) => {
                       assert.deepEqual(res.status, 200);
                   });
    });
    it('Enwiki Lead_paragraph_move has the infobox moved after the lead paragraph', () => {
        const title = `User:BSitzmann_%28WMF%29%2FMCS%2FTest%2FLead_paragraph_move`;
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        const exp = '<span><p>Lead paragraph should appear first';
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.sections[0].text.startsWith(exp),
                    `Expected section text to start with lead paragraph.
                    Actual text ${res.body.sections[0].text}`);
            });
    });
    it.skip('Enwiki hatnotes are promoted to the lead object', () => {
        const title = `Chivalric%20order`;
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        const anchor = `<a href="/wiki/Military_order_(society)" title="Military order (society)">`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.hatnotes[0],
                    `See also: ${anchor}Military order (society)</a>`,
                     'hatnote property present on lead.');
                assert.ok(res.body.sections[0].text.indexOf('See also:') > -1,
                    'Hatnote is repeated in text for backwards compatibility.');
            });
    });
    it('Enwiki multiple hatnotes are separated by <br> tag', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/S`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.hatnotes.length === 4,
                     '4 lines of hatnote inside hatnote property present on lead.');
            });
    });
    it('Enwiki Multiple page issues are promoted to lead', () => {
        const title = `User:Jdlrobson%2Fmcs-tests%2Fissues_bug`;
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.equal(res.body.issues.length, 2,
                  '2 issues are found in the page. Multiple issues heading is skipped.');
                assert.ok(res.body.sections[0].text.indexOf('ambox-multiple_issues') > -1,
                  'The ambox multiple issues class is preserved in the response.');
            });
    });
    it('Enwiki Pages with single issue have issue promoted to lead', () => {
        const title = `User:Jdlrobson%2Fmcs-tests%2Fissues_bug_3`;
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/${title}`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.issues.length === 1,
                  '1 issue was found on this page.');
                assert.ok(res.body.sections[0].text.indexOf('"ambox') === -1,
                  'No ambox issues class in response.');
            });
    });
    it('Enwiki Main page has no issues.', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections-lead/Main_Page`;
        return preq.get({ uri })
            .then((res) => {
                const err = 'No page issues should be recorded on the main page.';
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.issues === undefined, err);
            });
    });
});
