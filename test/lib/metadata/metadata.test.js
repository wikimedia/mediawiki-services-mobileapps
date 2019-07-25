'use strict';

const fs = require('fs');
const path = require('path');
const lib = require('../../../lib/metadata').testing;
const assert = require('../../utils/assert');

const ENWIKI_SITEINFO = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../fixtures/siteinfo_enwiki.json'), 'utf8'));

describe('lib:metadata', () => {

    describe('augmentLangLinks', () => {

        it('handles undefined langlinks', () => {
            assert.deepEqual(lib.augmentLangLinks(), undefined);
        });

        it('bails out if an empty title is found', () => {
            assert.deepEqual(lib.augmentLangLinks([{ lang: 'test', title: '' }]), undefined);
        });

        it('bails out if an empty title is found (and nonempty title exists)', () => {
            assert.deepEqual(lib.augmentLangLinks([
                { lang: 'test', title: 'Foo' },
                { lang: 'test2', title: '' }
            ]), undefined);
        });

        it('creates augmented langlink if input is good', () => {
            assert.deepEqual(lib.augmentLangLinks([
                { lang: 'test', title: 'Foo' },
            ], 'en.wikipedia.org', ENWIKI_SITEINFO), [
                {
                    lang: 'test',
                    summary_url: 'https://test.wikipedia.org/api/rest_v1/page/summary/Foo',
                    titles: {
                        canonical: 'Foo',
                        normalized: 'Foo'
                    }
                }
            ]);
        });

    });

    it('augmentCategories handles undefined categories', () => {
        assert.doesNotThrow(() => lib.augmentCategories());
    });

});
