/* eslint-env mocha */

'use strict';

const assert = require('../../utils/assert.js');
const parseProp = require('../../../lib/parseProperty.js');
const pickPronunciatonFilePageUrl = parseProp._pickPronunciationFilePageUrl;

describe('pickPronunciationFilePageUrl', () => {
    function padExpectedUrl(expected) {
        return ['/wiki/File:dummy0.ogg', expected, '/wiki/File:dummy1.ogg'];
    }

    it('spaces in title should not affect choice', () => {
        const expected = '/wiki/File:en-us-United-Arab-Emirates.ogg';
        const urls = padExpectedUrl(expected);
        const title = 'United Arab Emirates';
        const result = pickPronunciatonFilePageUrl(urls, title);
        assert.deepEqual(result, expected);
    });

    it('subset of filename should not affect choice', () => {
        const expected = '/wiki/File:República_de_Cuba.ogg';
        const urls = padExpectedUrl(expected);
        const title = 'Cuba';
        const result = pickPronunciatonFilePageUrl(urls, title);
        assert.deepEqual(result, expected);
    });

    it('RegExp title parsing not throw error for special characters', () => {
        const expected = '/wiki/File:Fake_file_url.ogg';
        const urls = padExpectedUrl(expected);
        const title = 'Sunn O)))';
        assert.ok(pickPronunciatonFilePageUrl(urls, title));
    });
});
