'use strict';
/* global describe, it */

const assert = require('../../utils/assert.js');
const pickPronunciatonFilePageUrl = require('../../../lib/parseProperty.js')._pickPronunciationFilePageUrl;

describe('pickPronunciationFilePageUrl', function() {
    function padExpectedUrl(expected) {
        return ['/wiki/File:dummy0.ogg', expected, '/wiki/File:dummy1.ogg'];
    }

    it('spaces in title should not affect choice', function() {
        const expected = '/wiki/File:en-us-United-Arab-Emirates.ogg';
        const urls = padExpectedUrl(expected);
        const title = 'United Arab Emirates';
        const result = pickPronunciatonFilePageUrl(urls, title);
        assert.deepEqual(result, expected);
    });

    it('subset of filename should not affect choice', function() {
        const expected = '/wiki/File:República_de_Cuba.ogg';
        const urls = padExpectedUrl(expected);
        const title = 'Cuba';
        const result = pickPronunciatonFilePageUrl(urls, title);
        assert.deepEqual(result, expected);
    });

    it('RegExp title parsing not throw error for special characters', function() {
        const expected = '/wiki/File:Fake_file_url.ogg';
        const urls = padExpectedUrl(expected);
        const title = 'Sunn O)))';
        assert.ok(pickPronunciatonFilePageUrl(urls, title));
    })
});
