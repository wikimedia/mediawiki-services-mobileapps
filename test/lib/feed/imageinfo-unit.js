'use strict';

const assert = require('../../utils/assert');
const imageinfo = require('../../../lib/imageinfo'); // module under test
const structureExtMetadataValue = imageinfo.testing.structureExtMetadataValue;

const descriptionValue = { en:'<span>foo</span>',de:'<span>bar</span>' };

describe('featured-image-unit', () => {

    it('structureExtMetadataValue returns description for preferred lang if present', () => {
        const result = structureExtMetadataValue(descriptionValue, 'de');
        assert.deepEqual(result.lang, 'de');
        assert.deepEqual(result.text, 'bar');
        assert.deepEqual(result.html, '<span>bar</span>');
    });

    it('structureExtMetadataValue falls back to en description if preferred lang not present', () => {
        const result = structureExtMetadataValue(descriptionValue, 'ja');
        assert.deepEqual(result.lang, 'en');
        assert.deepEqual(result.text, 'foo');
        assert.deepEqual(result.html, '<span>foo</span>');
    });

    it('structureExtMetadataValue returns lang undefined for type of value equals to string', () => {
        const result = structureExtMetadataValue('<span>lol</span>', 'zh');
        assert.deepEqual(result.lang, undefined);
        assert.deepEqual(result.text, 'lol');
        assert.deepEqual(result.html, '<span>lol</span>');
    });

    it('structureExtMetadataValue returns undefined for undefined input', () => {
        const result = structureExtMetadataValue(undefined, 'es');
        assert.deepEqual(result, undefined);
    });

});
