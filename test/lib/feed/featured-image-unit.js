'use strict';

const assert = require('../../utils/assert');
const featuredImage = require('../../../lib/feed/featured-image'); // module under test
const pickDescriptionLang = featuredImage.testing.pickDescriptionLang;

describe('featured-image-unit', () => {

    it('pickDescriptionLang resolves to lang if present', () => {
        const result = pickDescriptionLang({ 'en': 'foo', 'de': 'bar' }, 'de');
        assert.deepEqual(result, 'de');
    });

    it('pickDescriptionLang falls back to en if lang not present', () => {
        const result = pickDescriptionLang({ 'en': 'foo', 'de': 'bar' }, 'ja');
        assert.deepEqual(result, 'en');
    });

    it('pickDescriptionLang returns undefined for non-object input', () => {
        const result = pickDescriptionLang("<span>lol</span>", 'zh');
        assert.deepEqual(result, undefined);
    });

    it('pickDescriptionLang returns undefined for undefined input', () => {
        const result = pickDescriptionLang(undefined, 'es');
        assert.deepEqual(result, undefined);
    });

});
