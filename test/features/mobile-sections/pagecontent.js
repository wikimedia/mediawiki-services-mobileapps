'use strict';

const assert = require('../../utils/assert.js');
const headers = require('../../utils/headers.js');
const preq   = require('preq');
const server = require('../../utils/server.js');

describe('mobile-sections', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    const localUri = (title, domain = 'en.wikipedia.org') => {
        return `${server.config.uri}${domain}/v1/page/mobile-sections/${title}`;
    };

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        const uri = localUri('Foobar');
        return headers.checkHeaders(uri);
    });

    it('Supports revision number in request URL', () => {
        const title = '%2Fr%2FThe_Donald';
        const rev = 764101607;
        const uri = localUri(`${title}/${rev}`);
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.body.lead.revision, rev,
                    'the requested revision should be returned');
            });
    });

    it('Supports revision number and tid string in request URL', () => {
        const title = '%2Fr%2FThe_Donald';
        const rev = 764101607;
        const tid = 'b24de3d0-ecde-11e6-a863-ed5fc1010eed';
        const uri = localUri(`${title}/${rev}/${tid}`);
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.body.lead.revision, rev,
                    'We return the page with requested revision and tid');
            });
    });

    it('Mixmatch valid title and valid revision id gives 404', () => {
        const title = '%2Fr%2FThe_Donald';
        const rev = 752758357; // belongs to Roald Dahl
        const uri = localUri(`${title}/${rev}`);
        return preq.get({ uri })
            .catch((res) => {
                assert.equal(res.status, 404);
            });
    });

    it('Bad revision id gives bad request', () => {
        const title = '%2Fr%2FThe_Donald'; // belongs to Roald Dahl
        const rev = 'Reddit';
        const uri = localUri(`${title}/${rev}`);
        return preq.get({ uri })
            .catch((res) => {
                assert.equal(res.status, 400, 'Should be integer');
            });
    });

    it('Check content of fixed revision', () => {
        const title = 'Leonard_Cohen';
        const rev = 747517267; // revision before his death.
        const uri = localUri(`${title}/${rev}`);
        return preq.get({ uri })
        .then((res) => {
            let hasDeathSection = false;
            res.body.remaining.sections.forEach((section) => {
                if (section.line === 'Death') {
                    hasDeathSection = true;
                }
            });
            assert.ok(!hasDeathSection,
                'Leonard Cohen did not use to be dead. RIP dear man...');
        });
    });

    it('Check content of fresh revision', () => {
        const title = 'Leonard_Cohen';
        const uri = localUri(title);
        return preq.get({ uri })
        .then((res) => {
            let hasDeathSection = false;
            res.body.remaining.sections.forEach((section) => {
                if (section.line === 'Death') {
                    hasDeathSection = true;
                }
            });
            assert.ok(hasDeathSection,
                '... but he is now which makes me sad.');
        });
    });

    it('Missing title should respond with 404', () => {
        const uri = localUri('weoiuyrxcmxn', 'test.wikipedia.org');
        return preq.get({ uri })
        .then(() => {
            assert.fail("expected an exception to be thrown");
        }).catch((res) => {
            // Most checks are commented out here because the error messages are inconsistent.

            // const body = res.body;
            assert.deepEqual(res.status, 404);
            // assert.deepEqual(body.type, 'missingtitle');
            // assert.deepEqual(body.title, 'Not found.');
            // assert.deepEqual(body.detail, 'Page or revision not found.');
        });
    });

    // slightly different

    it('Page with IPA content', () => {
        const title = 'Sunderland_A.F.C./738562635';
        const uri = localUri(title);
        return preq.get({ uri })
        .then((res) => {
            const text = res.body.lead.sections[0].text;
            const expected = 'style="display: none;"><span class="IPA';
            assert.equal(res.status, 200);
            assert.ok(text.indexOf(expected) > -1,
                'IPA information should be wrapped in hidden container');
        });
    });

    // special

    it('Sections/deep page should have a lead object with expected properties', () => {
        const title = 'Sections%2Fdeep';
        const uri = localUri(title, 'test.wikipedia.org');
        return preq.get({ uri })
        .then((res) => {
            const lead = res.body.lead;
            const lastMod = lead.lastmodified;
            const prot = lead.protection;
            assert.deepEqual(res.status, 200);
            assert.ok(lastMod.startsWith('201'), `${lastMod} should start with 201`); // 2015-
            assert.deepEqual(lead.displaytitle, 'Sections/deep');
            assert.equal(lead.wikibase_item, undefined);
            assert.equal(lead.description, undefined);
            assert.ok(prot.constructor === Object, 'lead.protection should be an Object');
            assert.ok(!Object.keys(lead.protection).length, 'Page should not be protected');
            assert.deepEqual(lead.editable, true);
            assert.ok(lead.sections.length >= 6, 'Expected at least six section elements');
            assert.deepEqual(lead.sections[0].id, 0);
            assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');
        });
    });

    it('en Main page should have a lead object with expected properties', () => {
        const uri = localUri('Main_Page');
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body.lead;
                const lastMod = lead.lastmodified;
                assert.deepEqual(res.status, 200);
                assert.ok(lastMod.startsWith('201'), `${lastMod} should start with 201`); // 2015-
                assert.deepEqual(lead.displaytitle, 'Main Page');
                assert.deepEqual(lead.normalizedtitle, 'Main Page');
                assert.equal(lead.wikibase_item, 'Q5296');
                assert.ok(/main page/i.test(lead.description));
                assert.deepEqual(lead.protection, {
                    "edit": [
                        "sysop"
                    ],
                    "move": [
                        "sysop"
                    ]
                });
                assert.deepEqual(lead.editable, false);
                assert.deepEqual(lead.mainpage, true);
                assert.ok(lead.languagecount > 10);
                assert.ok(lead.sections.length > 0, 'Expected at least one section element');
                assert.deepEqual(lead.sections[0].id, 0);
                assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');
            });
    });

    it('Titles with special chars should not error out when parsing pronunciation files', () => {
        const uri = localUri('Sunn_O)))', 'vi.wikipedia.org');
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body.lead;
                const lastMod = lead.lastmodified;
                assert.deepEqual(res.status, 200);
                assert.ok(lastMod.startsWith('201'), `${lastMod} should start with 201`); // 2015-
                assert.deepEqual(lead.displaytitle, 'Sunn O)))');
                assert.deepEqual(lead.normalizedtitle, 'Sunn O)))');
                assert.ok(lead.sections.length > 0, 'Expected at least one section element');
                assert.deepEqual(lead.sections[0].id, 0);
                assert.ok(lead.sections[0].text.length > 0, 'Expected text to be non-empty');
            });
    });

    it('Page with known past \'text-decoration\' error should load successfully', () => {
        const title = `%E6%9F%A5%E5%85%8B%C2%B7%E8%91%9B%E9%87%8C%E8%8A%AC%E7%B4%8D%E5%A5%87`;
        const uri = localUri(title, 'zh.wikipedia.org');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
            });
    });

    it('Beta cluster request should load successfully', () => {
        const uri = localUri('Foobar', 'en.wikipedia.beta.wmflabs.org');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
            });
    });

    it('Page with irregular Spoken Wikipedia template usage should load correctly', () => {
        const filename = `File:En-Alliterative_verse-article.ogg`;
        const title = `Alliterative_verse`;
        const uri = localUri(title);
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.lead.spoken.files[0], filename);
            });
    });

    it('Page with HTML entity in redirected page title should load', () => {
        const title = `User:BSitzmann_%28WMF%29%2FMCS%2FTest%2FA%26B_redirect`;
        const uri = localUri(title, 'test.wikipedia.org');
        return preq.get({ uri })
            .then((res) => {
                const lead = res.body.lead;
                const redirectTitle = 'User:BSitzmann (WMF)/MCS/Test/A&B redirect';
                assert.deepEqual(res.status, 200);
                assert.deepEqual(lead.normalizedtitle, redirectTitle);
                assert.deepEqual(lead.displaytitle, 'User:BSitzmann (WMF)/MCS/Test/A&B');
                assert.deepEqual(lead.redirected, 'User:BSitzmann (WMF)/MCS/Test/A&B');
            });
    });

    it('Page with % in redirected page title should load [beta cluster]', () => {
        const title = `User:Pchelolo%2fRedirect_Test`;
        const uri = localUri(title, 'en.wikipedia.beta.wmflabs.org');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.lead.normalizedtitle, 'User:Pchelolo/Redirect Test');
                assert.deepEqual(res.body.lead.displaytitle, 'User:Pchelolo/Redirect Target %');
                assert.deepEqual(res.body.lead.redirected, 'User:Pchelolo/Redirect Target %');
            });
    });

    it('Page with % in redirected page title should load 2', () => {
        const title = `User:BSitzmann_%28WMF%29%2FMCS%2FTest%2Fredirect_test2`;
        const normalizedTitle = 'User:BSitzmann (WMF)/MCS/Test/redirect test2';
        const displayTitle = 'User:BSitzmann (WMF)/MCS/Test/redirect test2 target %';
        const uri = localUri(title, 'test.wikipedia.org');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.lead.normalizedtitle, normalizedTitle);
                assert.deepEqual(res.body.lead.displaytitle, displayTitle);
                assert.deepEqual(res.body.lead.redirected, displayTitle);
            });
    });

    it('Page with % in section header of redirected page title should load', () => {
        const title = `User:BSitzmann_%28WMF%29%2FMCS%2FTest%2Fredirect_test3`;
        const normalizedTitle = 'User:BSitzmann (WMF)/MCS/Test/redirect test3';
        const displayTitle = 'User:BSitzmann (WMF)/MCS/Test/redirect test3 target';
        const titleWithFragment = 'User:BSitzmann (WMF)/MCS/Test/redirect test3 target#Section_.25';
        const uri = localUri(title, 'test.wikipedia.org');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.lead.normalizedtitle, normalizedTitle);
                assert.deepEqual(res.body.lead.displaytitle, displayTitle);
                assert.deepEqual(res.body.lead.redirected, titleWithFragment);
            });
    });

    it('Internal links should have title attribute', () => {
        const title = `User:BSitzmann_%28WMF%29%2FMCS%2FTest%2FTitleLinkEncoding`;
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
        const title = `Verallgemeinerter_Laplace-Operator`;
        const uri = localUri(title, 'de.wikipedia.org');
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
            });
    });
});
