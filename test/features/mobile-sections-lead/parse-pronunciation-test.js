'use strict';
/* global describe, it */

var assert = require('../../utils/assert.js');
var pickPronunciatonFilePageUrl = require('../../../lib/parseProperty.js')._pickPronunciationFilePageUrl;

describe('pickPronunciationFilePageUrl', function() {
    function padExpectedUrl(expected) {
        return ['/wiki/File:dummy0.ogg', expected, '/wiki/File:dummy1.ogg'];
    }

    it('spaces in title should not affect choice', function() {
        var expected = '/wiki/File:en-us-United-Arab-Emirates.ogg';
        var urls = padExpectedUrl(expected);
        var title = 'United Arab Emirates';
        var result = pickPronunciatonFilePageUrl(urls, title);
        assert.deepEqual(result, expected);
    });

    it('subset of filename should not affect choice', function() {
        var expected = '/wiki/File:República_de_Cuba.ogg';
        var urls = padExpectedUrl(expected);
        var title = 'Cuba';
        var result = pickPronunciatonFilePageUrl(urls, title);
        assert.deepEqual(result, expected);
    });

    it('RegExp title parsing not throw error for special characters', function() {
        var expected = '/wiki/File:Fake_file_url.ogg';
        var urls = padExpectedUrl(expected);
        var title = 'Sunn O)))';
        assert.ok(pickPronunciatonFilePageUrl(urls, title));
    })
});
