/* eslint-env mocha */

'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');
const headers = require('../../utils/headers.js');

describe('mobile-sections', function() {

    /* eslint no-invalid-this: "off" */
    this.timeout(20000);

    before(() => { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections/Foobar`;
        return headers.checkHeaders(uri);
    });

    it('return the sent ETag', () => {
        return preq.get({
            uri: `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections/Foobar`,
            headers: { 'x-restbase-etag': '123456/c3421381-7109-11e5-ac43-8c7f067c3520' }
        }).then((res) => {
            assert.status(res, 200);
            assert.deepEqual(res.headers.etag, '123456/c3421381-7109-11e5-ac43-8c7f067c3520');
        });
    });

    it('Sections/deep page should have a lead object with expected properties', () => {
        const title = 'Sections%2Fdeep';
        const uri = `${server.config.uri}test.wikipedia.org/v1/page/mobile-sections/${title}`;
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
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections/Main_Page`;
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
        const uri = `${server.config.uri}vi.wikipedia.org/v1/page/mobile-sections/Sunn_O)))`;
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

    it('Missing title should respond with 404', () => {
        const uri = `${server.config.uri}test.wikipedia.org/v1/page/mobile-sections/weoiuyrxcmxn`;
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

    it('Page with known past \'text-decoration\' error should load successfully', () => {
        const title = `%E6%9F%A5%E5%85%8B%C2%B7%E8%91%9B%E9%87%8C%E8%8A%AC%E7%B4%8D%E5%A5%87`;
        const uri = `${server.config.uri}zh.wikipedia.org/v1/page/mobile-sections/${title}`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
            });
    });

    it('Beta cluster request should load successfully', () => {
        const domain = `en.wikipedia.beta.wmflabs.org`;
        const uri = `${server.config.uri}${domain}/v1/page/mobile-sections/Foobar`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
            });
    });

    it('Page with irregular Spoken Wikipedia template usage should load correctly', () => {
        const filename = `File:En-Alliterative_verse-article.ogg`;
        const title = `Alliterative_verse`;
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections/${title}`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.lead.spoken.files[0], filename);
            });
    });

    it('Page with HTML entity in redirected page title should load', () => {
        const title = `User:BSitzmann_%28WMF%29%2FMCS%2FTest%2FA%26B_redirect`;
        const uri = `${server.config.uri}test.wikipedia.org/v1/page/mobile-sections/${title}`;
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
        const domain = `en.wikipedia.beta.wmflabs.org`;
        const title = `User:Pchelolo%2fRedirect_Test`;
        const uri = `${server.config.uri}${domain}/v1/page/mobile-sections/${title}`;
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
        const uri = `${server.config.uri}test.wikipedia.org/v1/page/mobile-sections/${title}`;
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
        const uri = `${server.config.uri}test.wikipedia.org/v1/page/mobile-sections/${title}`;
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
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections/${title}`;
        const expectedText = '<a href="/wiki/Sort_(C++)" title="Sort (C++)">';
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.contains(res.body.lead.sections[0].text, expectedText);
            });
    });
    it('Any sections that contain references should have a reference flag', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections/Barack_Obama`;
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

    it('Requesting just references returns only sections with references', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/references/Barack_Obama`;
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.equal(res.body.sections.length, 4, 'Barack Obama has 4 reference sections');
            });
    });

    it('The last section can be marked as a reference section', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-sections/Vallejo_(ferry)`;
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
        const uri = `${server.config.uri}de.wikipedia.org/v1/page/mobile-sections/${title}`;
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
            });
    });
});
