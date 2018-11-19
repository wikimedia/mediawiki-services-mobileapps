'use strict';

const assert = require('../../utils/assert');
const imageinfo = require('../../../lib/imageinfo'); // module under test
const getDescription = imageinfo.testing.getDescription;

let descriptionValue = { en:'<span>foo</span>',de:'<span>bar</span>' };

describe('featured-image-unit', () => {

    it('getDescription returns description for preferred lang if present', () => {
        const req = {
            params: {
                domain: 'de.wikipedia.org'
            }
        };

        const result = getDescription(req, descriptionValue);
        assert.deepEqual(result.lang, 'de');
        assert.deepEqual(result.text, 'bar');
        assert.deepEqual(result.html, '<span>bar</span>');
    });

    it('getDescription falls back to en description if preferred lang not present', () => {
        const req = {
            params: {
                domain: 'ja.wikipedia.org'
            }
        };
        const result = getDescription(req, descriptionValue);
        assert.deepEqual(result.lang, 'en');
        assert.deepEqual(result.text, 'foo');
        assert.deepEqual(result.html, '<span>foo</span>');
    });

    it('getDescription returns lang undefined for type of value equals to string', () => {
        const req = {
            params: {
                domain: 'zh.wikipedia.org'
            }
        };
        descriptionValue = '<span>lol</span>';
        const result = getDescription(req, descriptionValue);
        assert.deepEqual(result.lang, undefined);
        assert.deepEqual(result.text, 'lol');
        assert.deepEqual(result.html, '<span>lol</span>');
    });

    it('getDescription returns undefined for undefined input', () => {
        const req = {
            params: {
                domain: 'es.wikipedia.org'
            }
        };
        const result = getDescription(req, undefined);
        assert.deepEqual(result, undefined);
    });

});
