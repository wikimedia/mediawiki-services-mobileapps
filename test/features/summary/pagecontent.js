'use strict';

const preq = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');

function assertHasAllRequiredProperties(body) {
    const desktopUrls = body.content_urls.desktop;
    const mobileUrls = body.content_urls.mobile;
    assert.ok(body.namespace.id || body.namespace.id === 0);
    assert.ok(body.namespace.text || body.namespace.text === '');
    assert.ok(body.titles.canonical);
    assert.ok(body.titles.normalized);
    assert.ok(body.titles.display);
    assert.ok(body.pageid);
    assert.ok(body.lang);
    assert.ok(body.dir);
    assert.ok(body.revision);
    assert.ok(body.tid);
    assert.ok(body.timestamp);
    [ desktopUrls, mobileUrls ].forEach((contentUrls) => {
        assert.ok(contentUrls.page);
        assert.ok(contentUrls.revisions);
        assert.ok(contentUrls.edit);
    });
}

describe('summary', function() {

    this.timeout(20000);

    before(() => server.start());

    const localUri = (title, domain = 'en.wikipedia.org') => {
        return `${server.config.uri}${domain}/v1/page/summary/${title}`;
    };

    it('should respond with expected properties in payload', () => {
        const uri = localUri('Foobar/798652007');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.type, 'standard');
                assertHasAllRequiredProperties(res.body);
            });
    });

    it('empty summary should be sent for empty page', () => {
        const uri = localUri('Empty', 'test.wikipedia.org');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.type, 'standard');
                assert.deepEqual(res.body.extract, '', 'should send empty plaintext extract');
                assert.deepEqual(res.body.extract_html, '', 'should send empty html extract');
                assertHasAllRequiredProperties(res.body);
            });
    });

    it("main page should return empty summary and type should be 'mainpage'", () => {
        const uri = localUri('Main_Page');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.type, 'mainpage', "type should be 'mainpage'");
                assert.deepEqual(res.body.extract, '', 'should send empty plaintext extract');
                assert.deepEqual(res.body.extract_html, '', 'should send empty html extract');
                assertHasAllRequiredProperties(res.body);
            });
    });

    it("main page in non-mainspace should also return type: 'mainpage'", () => {
        const uri = localUri('Wikipedia:Hauptseite', 'de.wikipedia.org');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.type, 'mainpage', "type should be 'mainpage'");
                assert.deepEqual(res.body.extract, '', 'should send empty plaintext extract');
                assert.deepEqual(res.body.extract_html, '', 'should send empty html extract');
                assertHasAllRequiredProperties(res.body);
            });
    });

    it('summary should come from first real content paragraph', () => {
        const uri = localUri('Berliner_Mauer/173761365', 'de.wikipedia.org');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.type, 'standard', "type should be 'standard'");
                assert.contains(res.body.extract, 'Berliner Mauer');
                assert.contains(res.body.extract_html, '<b>Berliner Mauer</b>');
                assertHasAllRequiredProperties(res.body);
            });
    });

    function shouldReturnEmptyExtracts(uri) {
        return preq.get({ uri })
        .then((res) => {
            assert.deepEqual(res.status, 200);
            assert.deepEqual(res.body.type, 'no-extract');
            assert.deepEqual(res.body.extract, '', 'extract should be empty');
            assert.deepEqual(res.body.extract_html, '', 'extract_html should be empty');
            assertHasAllRequiredProperties(res.body);
        });
    }

    it('Empty extracts should be returned for a file page', () => {
        shouldReturnEmptyExtracts(localUri('File:En-Alliterative_verse-article.ogg', 'commons.wikimedia.org'));
    });

    it('Empty extracts should be returned for a talk page', () => {
        shouldReturnEmptyExtracts(localUri('Talk:Foobar'));
    });

    it('Empty extracts should be returned for a redirected page', () => {
        shouldReturnEmptyExtracts(localUri('Barack'));
    });

    it('timestamp should refer to the requested revision, not the latest revision', () => {
        const uri = localUri('John_Candy/813020982');
        return preq.get({ uri })
        .then((res) => {
            assert.deepEqual(res.status, 200);
            assert.deepEqual(res.body.type, 'standard');
            assert.deepEqual(res.body.timestamp, '2017-12-01T07:29:24Z');
            assertHasAllRequiredProperties(res.body);
        });
    });

    it("404 for a page that doesn't exist", () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/summary/ashsahahash`;
        return preq.get({ uri })
            .catch((res) => {
                assert.ok(res.status === 404, 'Pages that do not exist 404');
            });
    });

    it('404 for a page with invalid title', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/summary/W::Mammalia`;
        return preq.get({ uri })
            .catch((res) => {
                assert.ok(res.status === 404, 'Invalid page titles 404');
            });
    });

    it('Description from local wiki should be used', () => {
        const uri = localUri(encodeURIComponent('User:BSitzmann_(WMF)/MCS/Test/Description'),
            'test.wikipedia.org');
        return preq.get({ uri })
        .then((res) => {
            const summary = res.body;
            assert.deepEqual(summary.description, 'funny description, haha');
        });
    });

    it('Summary URLs do not contain un-encoded special characters (T216739)', () => {
        const uri = localUri(encodeURIComponent('January–February_2019_North_American_cold_wave'));
        return preq.get({ uri })
        .then((res) => {
            const summary = res.body;
            assert.notContains(JSON.stringify(summary), '—');
        });
    });

    it('Stray leading citation and template are stripped before parsing intro (T225474)', () => {
        const uri = localUri('Financial_statement/891354485');
        return preq.get(uri)
        .then((res) => {
            assert.ok(res.body.extract.length);
            assert.ok(res.body.extract_html.length);
        });
    });
});
