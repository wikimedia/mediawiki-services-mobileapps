'use strict';

const assert = require('../../utils/assert');
const featuredImage = require('../../../lib/feed/featured-image'); // module under test
const getDescription = featuredImage.testing.getDescription;

describe('featured-image-unit', () => {

    it('getDescription returns description for preferred lang if present', () => {
        const result = getDescription({ en:'foo',de:'bar' }, 'de');
        assert.deepEqual(result.lang, 'de');
        assert.deepEqual(result.text, 'bar');
    });

    it('getDescription falls back to en description if preferred lang not present', () => {
        const result = getDescription({ en:'foo',de:'bar' }, 'ja');
        assert.deepEqual(result.lang, 'en');
        assert.deepEqual(result.text, 'foo');
    });

    it('getDescription returns undefined for non-object input', () => {
        const result = getDescription("<span>lol</span>", 'zh');
        assert.deepEqual(result, undefined);
    });

    it('getDescription returns undefined for undefined input', () => {
        const result = getDescription(undefined, 'es');
        assert.deepEqual(result, undefined);
    });

});
