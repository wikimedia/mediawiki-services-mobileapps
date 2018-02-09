'use strict';

const preq = require('preq');
const assert = require('../../utils/assert.js');
const headers = require('../../utils/headers.js');
const server = require('../../utils/server.js');

describe('summary', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    const localUri = (title, domain = 'en.wikipedia.org') => {
        return `${server.config.uri}${domain}/v1/page/summary/${title}`;
    };

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        const uri = localUri('Foobar');
        return headers.checkHeaders(uri);
    });

    it('should respond with expected properties in payload', () => {
        const uri = localUri('Foobar/798652007');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.type, 'standard');
                assert.deepEqual(res.body.revision, 798652007);
                assert.deepEqual(res.body.titles.canonical, "Foobar");
                assert.deepEqual(res.body.titles.normalized, "Foobar");
                assert.deepEqual(res.body.titles.display, "Foobar");
                assert.ok(res.body.extract.indexOf('foobar') > -1);
                assert.ok(res.body.extract_html.indexOf('<b>foobar</b>') > -1);
            });
    });

    it('empty summary (not 204) should be sent for empty page', () => {
        const uri = localUri('Empty', 'test.wikipedia.org');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.type, 'standard');
                assert.deepEqual(res.body.extract, '', 'should send empty plaintext extract');
                assert.deepEqual(res.body.extract_html, '', 'should send empty html extract');
            });
    });

    it('main page should return empty summary (not 204) and type should be \'mainpage\'', () => {
        const uri = localUri('Main_Page');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.type, 'mainpage', 'type should be \'mainpage\'');
                assert.deepEqual(res.body.extract, '', 'should send empty plaintext extract');
                assert.deepEqual(res.body.extract_html, '', 'should send empty html extract');
            });
    });

    it('main page in non-mainspace should also return type: \'mainpage\'', () => {
        const uri = localUri('Wikipedia:Hauptseite', 'de.wikipedia.org');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.type, 'mainpage', 'type should be \'mainpage\'');
                assert.deepEqual(res.body.extract, '', 'should send empty plaintext extract');
                assert.deepEqual(res.body.extract_html, '', 'should send empty html extract');
            });
    });

    it('summary should come from first real content paragraph', () => {
        const uri = localUri('Berliner_Mauer/173761365', 'de.wikipedia.org');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.type, 'standard', 'type should be \'standard\'');
                assert.contains(res.body.extract, 'Berliner Mauer');
                assert.contains(res.body.extract_html, '<b>Berliner Mauer</b>');
            });
    });

    function should204(uri) {
        return preq.get({ uri })
        .then((res) => {
            assert.deepEqual(res.status, 204);
            assert.deepEqual(res.body, undefined, 'no content');
        });
    }

    it('204 should be returned for a file page', () => {
        should204(localUri('File:En-Alliterative_verse-article.ogg', 'commons.wikimedia.org'));
    });

    it('204 should be returned for a talk page', () => {
        should204(localUri('Talk:Foobar'));
    });

    it('204 should be returned for a redirected page', () => {
        should204(localUri('Barack'));
    });

    it('timestamp should refer to the requested revision, not the latest revision', () => {
        const uri = localUri('John_Candy/813020982');
        return preq.get({ uri })
        .then((res) => {
            assert.deepEqual(res.status, 200);
            assert.deepEqual(res.body.type, 'standard');
            assert.deepEqual(res.body.timestamp, '2017-12-01T07:29:24Z');
        });
    });
});
