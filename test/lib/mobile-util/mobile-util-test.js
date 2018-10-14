'use strict';

const assert = require('../../utils/assert');
const mUtil = require('../../../lib/mobile-util');
const domino = require('domino');
const MockResponse = require('mock-express-response');

describe('lib:mobile-util', () => {

    it('removeTLD should remove TLD', () => {
        assert.deepEqual(mUtil.removeTLD('ru.wikipedia.org'), 'ru.wikipedia');
    });

    it('URL fragments should be stripped correctly', () => {
        assert.deepEqual(mUtil.removeFragment('100_metres_hurdles#Top_25_fastest_athletes'),
            '100_metres_hurdles');
        assert.deepEqual(mUtil.removeFragment('Kendra_Harrison'), 'Kendra_Harrison');
    });

    it('removeLinkPrefix should strip the ./ correctly', () => {
        assert.deepEqual(mUtil.removeLinkPrefix('./100_metres_hurdles#Top_25_fastest_athletes'),
            '100_metres_hurdles#Top_25_fastest_athletes');
        assert.deepEqual(mUtil.removeLinkPrefix('Kendra_Harrison'), 'Kendra_Harrison');
    });

    it('extractDbTitleFromAnchor should get the right parts of the href', () => {
        const linkHtml = `<html><head><base href="//en.wikipedia.org/wiki/"/></head></html><body>
<a href="./My_db_title">foo bar</a></body></html>`;
        const document = domino.createDocument(linkHtml);
        const link = document.querySelector('a');
        assert.deepEqual(mUtil.extractDbTitleFromAnchor(link), 'My_db_title');
    });

    it('mwApiTrue handles formatversions 1 and 2', () => {
        const test = { true1: '', true2: true, false2: false };
        assert.deepEqual(mUtil.mwApiTrue(test, 'true1'), true);
        assert.deepEqual(mUtil.mwApiTrue(test, 'true2'), true);
        assert.deepEqual(mUtil.mwApiTrue(test, 'false1'), false);
        assert.deepEqual(mUtil.mwApiTrue(test, 'false2'), false);
    });

    it('domainForLangCode swaps in lang code if domain has >2 levels', () => {
        assert.deepEqual(mUtil.domainForLangCode('en.wikipedia.org', 'de'), 'de.wikipedia.org');
        // eslint-disable-next-line max-len
        assert.deepEqual(mUtil.domainForLangCode('de.wikipedia.beta.wmflabs.org', 'ja'), 'ja.wikipedia.beta.wmflabs.org');
        assert.deepEqual(mUtil.domainForLangCode('mediawiki.org', 'es'), 'mediawiki.org');
    });

    describe('setLanguageHeaders', () => {

        it('passes through headers (lower-case names in original)', () => {
            const res = new MockResponse();
            mUtil.setLanguageHeaders(res, {
                vary: 'foo',
                'content-language': 'bar'
            });
            assert.deepEqual(res.get('Vary'), 'foo');
            assert.deepEqual(res.get('Content-Language'), 'bar');
        });

        it('passes through headers (upper-case names in original)', () => {
            const res = new MockResponse();
            mUtil.setLanguageHeaders(res, {
                Vary: 'foo',
                'Content-Language': 'bar'
            });
            assert.deepEqual(res.get('Vary'), 'foo');
            assert.deepEqual(res.get('Content-Language'), 'bar');
        });

        it('strips \'accept\' from vary value with other values present', () => {
            const res = new MockResponse();
            mUtil.setLanguageHeaders(res, {
                vary: 'accept, accept-language',
            });
            assert.deepEqual(res.get('Vary'), 'accept-language');
        });

        it('strips \'Accept\' from vary value with other values present', () => {
            const res = new MockResponse();
            mUtil.setLanguageHeaders(res, {
                Vary: 'Accept, Accept-Language',
            });
            assert.deepEqual(res.get('Vary'), 'Accept-Language');
        });

        it('strips vary header if set to \'Accept\' only', () => {
            const res = new MockResponse();
            mUtil.setLanguageHeaders(res, {
                Vary: 'Accept',
            });
            assert.deepEqual(res.get('Vary'), undefined);
        });

        it('strips vary header if set to \'accept\' only', () => {
            const res = new MockResponse();
            mUtil.setLanguageHeaders(res, {
                Vary: 'accept',
            });
            assert.deepEqual(res.get('Vary'), undefined);
        });
    });
});
