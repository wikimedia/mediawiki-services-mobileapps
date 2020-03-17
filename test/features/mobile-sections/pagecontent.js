'use strict';

const assert = require('../../utils/assert.js');
const preq = require('preq');
const server = require('../../utils/server.js');

describe('mobile-sections', function() {

    this.timeout(20000);

    before(() => server.start());

    const localUri = (title, domain = 'en.wikipedia.org') => {
        return `${server.config.uri}${domain}/v1/page/mobile-sections/${title}`;
    };

    it('Mismatched title and revision id give 404', () => {
        const title = '%2Fr%2FThe_Donald';
        const rev = 752758357; // belongs to Roald Dahl
        const uri = localUri(`${title}/${rev}`);
        return preq.get({ uri })
        .catch((res) => {
            assert.equal(res.status, 404);
        });
    });

    it('Malformed revision id gives bad request', () => {
        const title = '%2Fr%2FThe_Donald'; // belongs to Roald Dahl
        const rev = 'Reddit';
        const uri = localUri(`${title}/${rev}`);
        return preq.get({ uri })
        .catch((res) => {
            assert.equal(res.status, 400, 'Should be integer');
        });
    });

    it('Missing title should respond with 404', () => {
        const uri = localUri('weoiuyrxcmxn', 'test.wikipedia.org');
        return preq.get({ uri })
        .then(() => {
            assert.fail('expected an exception to be thrown');
        }).catch((res) => {
            assert.equal(res.status, 404);
        });
    });

    it('Sections/deep page should have a lead object with expected properties', () => {
        const title = 'Sections%2Fdeep';
        const uri = localUri(title, 'test.wikipedia.org');
        return preq.get({ uri })
        .then((res) => {
            const lead = res.body.lead;
            const lastMod = lead.lastmodified;
            const prot = lead.protection;
            assert.equal(res.status, 200);
            assert.ok(lastMod.startsWith('20'), `${lastMod} should start with 20`); // 2015-
            assert.equal(lead.displaytitle, 'Sections/deep');
            assert.equal(lead.wikibase_item, undefined);
            assert.equal(lead.description, undefined);
            assert.ok(prot.constructor === Object, 'lead.protection should be an Object');
            assert.ok(!Object.keys(lead.protection).length, 'Page should not be protected');
            assert.equal(lead.editable, true);
            assert.ok(lead.sections.length >= 6, 'Expected at least six section elements');
            assert.equal(lead.sections[0].id, 0);
            assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');
        });
    });

    it('en Main page should have a lead object with expected properties', () => {
        const uri = localUri('Main_Page');
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body.lead;
                const lastMod = lead.lastmodified;
                assert.equal(res.status, 200);
                assert.ok(lastMod.startsWith('20'), `${lastMod} should start with 20`); // 2015-
                assert.equal(lead.displaytitle, 'Main Page');
                assert.equal(lead.normalizedtitle, 'Main Page');
                assert.equal(lead.wikibase_item, 'Q5296');
                assert.deepEqual(lead.protection, {
                    edit: [
                        'sysop'
                    ],
                    move: [
                        'sysop'
                    ]
                });
                assert.equal(lead.editable, false);
                assert.equal(lead.mainpage, true);
                assert.ok(lead.languagecount > 10);
                assert.ok(lead.sections.length > 0, 'Expected at least one section element');
                assert.equal(lead.sections[0].id, 0);
                assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');
            });
    });

    it('Description from local wiki should be used', () => {
        const uri = localUri(encodeURIComponent('User:BSitzmann_(WMF)/MCS/Test/Description'),
            'test.wikipedia.org');
        return preq.get({ uri })
        .then((res) => {
            const lead = res.body.lead;
            assert.deepEqual(lead.description, 'funny description, haha');
            assert.deepEqual(lead.description_source, 'local');
        });
    });

    it('Titles with special chars should not error out when parsing pronunciation files', () => {
        const uri = localUri('Sunn_O)))', 'vi.wikipedia.org');
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body.lead;
                const lastMod = lead.lastmodified;
                assert.equal(res.status, 200);
                assert.ok(lastMod.startsWith('20'), `${lastMod} should start with 20`); // 2015-
                assert.equal(lead.displaytitle, 'Sunn O)))');
                assert.equal(lead.normalizedtitle, 'Sunn O)))');
                assert.ok(lead.sections.length > 0, 'Expected at least one section element');
                assert.equal(lead.sections[0].id, 0);
                assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');
            });
    });

    it("Page with known past 'text-decoration' error should load successfully", () => {
        const title = '%E6%9F%A5%E5%85%8B%C2%B7%E8%91%9B%E9%87%8C%E8%8A%AC%E7%B4%8D%E5%A5%87';
        const uri = localUri(title, 'zh.wikipedia.org');
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
            });
    });

    // TODO: remove skip
    // beta cluster is down right now
    it.skip('Beta cluster request should load successfully', () => {
        const uri = localUri('Foobar', 'en.wikipedia.beta.wmflabs.org');
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
            });
    });

    it('Page with irregular Spoken Wikipedia template usage should load correctly', () => {
        const filename = 'File:En-Alliterative_verse-article.ogg';
        const title = 'Alliterative_verse';
        const uri = localUri(title);
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.equal(res.body.lead.spoken.files[0], filename);
            });
    });

    it('Internal links should have title attribute', () => {
        const title = 'User:BSitzmann_%28WMF%29%2FMCS%2FTest%2FTitleLinkEncoding';
        const uri = localUri(title);
        const expectedText = '<a href="/wiki/Sort_(C++)" title="Sort (C++)"';
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.contains(res.body.lead.sections[0].text, expectedText);
            });
    });

    it('Any sections that contain references should have a reference flag', () => {
        const uri = localUri('Barack_Obama');
        const sections = [ 'Notes and references', 'Notes', 'References', 'Further reading' ];
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                res.body.remaining.sections.forEach((section) => {
                    if (sections.indexOf(section.line) > -1) {
                        const ref = section.isReferenceSection === true;
                        assert.ok(ref, `${section.line} should have a reference flag`);
                    } else {
                        const noRef = section.isReferenceSection === undefined;
                        assert.ok(noRef, `${section.line} should have no reference flag`);
                    }
                });
            });
    });

    it('The last section can be marked as a reference section', () => {
        const uri = localUri('Vallejo_(ferry)');
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                res.body.remaining.sections.forEach((section) => {
                    if ([ 'References' ].indexOf(section.line) > -1) {
                        const ref = section.isReferenceSection === true;
                        assert.ok(ref, `${section.line} should have a reference flag`);
                    } else {
                        const noRef = section.isReferenceSection === undefined;
                        assert.ok(noRef, `${section.line} should have no reference flag`);
                    }
                });
            });
    });

    it('Page with math formulas should load without error', () => {
        const title = 'Verallgemeinerter_Laplace-Operator';
        const uri = localUri(title, 'de.wikipedia.org');
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
            });
    });
});
