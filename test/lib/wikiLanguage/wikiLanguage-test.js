'use strict';

const wikiLanguage = require('../../../lib/wikiLanguage');
const assert = require('../../utils/assert');

describe('lib:wikiLanguage', () => {
    it('parses accept language headers', () => {
        const parsedTags = wikiLanguage.parseAcceptLanguageHeaderIntoLanguageTags('en-US, sr-Latn;q=0.8, zh-Hans-CN;q=0.9');
        assert.equal(parsedTags[0].tag, 'en-US');
        assert.deepEqual(parsedTags[0].components, ['en', 'US']);
        assert.equal(parsedTags[0].quality, 1.0);
        assert.equal(parsedTags[1].tag, 'sr-Latn');
        assert.deepEqual(parsedTags[1].components, ['sr', 'Latn']);
        assert.equal(parsedTags[1].quality, 0.8);
        assert.equal(parsedTags[2].tag, 'zh-Hans-CN');
        assert.deepEqual(parsedTags[2].components, ['zh', 'Hans', 'CN']);
        assert.equal(parsedTags[2].quality, 0.9);
    });

    it('parses accept language headers without spaces', () => {
        const parsedTags = wikiLanguage.parseAcceptLanguageHeaderIntoLanguageTags('en-US,sr-Latn;q=0.8,zh-Hans-CN;q=0.9');
        assert.equal(parsedTags[0].tag, 'en-US');
        assert.deepEqual(parsedTags[0].components, ['en', 'US']);
        assert.equal(parsedTags[0].quality, 1.0);
        assert.equal(parsedTags[1].tag, 'sr-Latn');
        assert.deepEqual(parsedTags[1].components, ['sr', 'Latn']);
        assert.equal(parsedTags[1].quality, 0.8);
        assert.equal(parsedTags[2].tag, 'zh-Hans-CN');
        assert.deepEqual(parsedTags[2].components, ['zh', 'Hans', 'CN']);
        assert.equal(parsedTags[2].quality, 0.9);
    });

    it('parses accept language headers with inconsistent spaces', () => {
        const parsedTags = wikiLanguage.parseAcceptLanguageHeaderIntoLanguageTags('en-US,    sr-Latn;q  =0.8,zh-Hans-CN; q=  0.9');
        assert.equal(parsedTags[0].tag, 'en-US');
        assert.deepEqual(parsedTags[0].components, ['en', 'US']);
        assert.equal(parsedTags[0].quality, 1.0);
        assert.equal(parsedTags[1].tag, 'sr-Latn');
        assert.deepEqual(parsedTags[1].components, ['sr', 'Latn']);
        assert.equal(parsedTags[1].quality, 0.8);
        assert.equal(parsedTags[2].tag, 'zh-Hans-CN');
        assert.deepEqual(parsedTags[2].components, ['zh', 'Hans', 'CN']);
        assert.equal(parsedTags[2].quality, 0.9);
    });

    it('returns relevant srwiki language codes', () => {
        let relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('en-US, sr-Latn;q=0.8, zh-Hans-CN; q=0.9', 'sr');
        assert.deepEqual(relevantCodes, ['sr-el', 'sr']);
        relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('en-US,sr-Latn;q=0.8,sr-Cyrl;q=0.9', 'sr');
        assert.deepEqual(relevantCodes, ['sr-ec', 'sr-el', 'sr']);
    });

    it('returns relevant zhwiki language codes', () => {
        let relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('en-US,sr-Latn;q=0.8,zh-Hans-CN;q=0.9', 'zh');
        assert.deepEqual(relevantCodes, ['zh-cn', 'zh']);
        relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('sr-Cyrl', 'zh');
        assert.deepEqual(relevantCodes, ['zh']);
        relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('zh-Hans,zh-Hant;q=0.9,zh-cn;q=0.8', 'zh');
        assert.deepEqual(relevantCodes, ['zh-hans', 'zh-hant', 'zh-cn', 'zh']);
        relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('zh-Invalid-ok', 'zh');
        assert.deepEqual(relevantCodes, ['zh']);
        relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('zh-hans-notarealcode', 'zh');
        assert.deepEqual(relevantCodes, ['zh-hans', 'zh']);
    });

    it('falls back on the provided language code', () => {
        const relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('en-US,zh-Hans-CN;q=0.9', 'sr');
        assert.deepEqual(relevantCodes, ['sr']);
    });

    it('removes duplicates', () => {
        const relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('zh-Hans,zh-Hans;q=0.9', 'zh');
        assert.deepEqual(relevantCodes, ['zh-hans', 'zh']);
    });

    it('handles invalid input', () => {
        let relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('lorem, ipsum q=1.0, ;', 'zh');
        assert.deepEqual(relevantCodes, ['zh']);
        relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('', 'zh');
        assert.deepEqual(relevantCodes, ['zh']);
        relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('*', 'sr');
        assert.deepEqual(relevantCodes, ['sr']);
        relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('srel-el', 'sr');
        assert.deepEqual(relevantCodes, ['sr']);
    });

    it('handles legacy input', () => {
        let relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('sr-el', 'sr');
        assert.deepEqual(relevantCodes, ['sr-el', 'sr']);
        relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('sr-ec', 'sr');
        assert.deepEqual(relevantCodes, ['sr-ec', 'sr']);
        relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('zh-tw', 'zh');
        assert.deepEqual(relevantCodes, ['zh-tw', 'zh']);
        relevantCodes = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader('zh-mo', 'zh');
        assert.deepEqual(relevantCodes, ['zh-mo', 'zh']);
    });

    it('identifies languages with variants', () => {
        assert.equal(wikiLanguage.isLanguageCodeWithVariants('sr'), true);
        assert.equal(wikiLanguage.isLanguageCodeWithVariants('zh'), true);
        assert.equal(wikiLanguage.isLanguageCodeWithVariants('en'), false);
        assert.equal(wikiLanguage.isLanguageCodeWithVariants('de'), false);
        assert.equal(wikiLanguage.isLanguageCodeWithVariants('fr'), false);
    });

    it('parses the language code from a domain', () => {
        assert.equal(wikiLanguage.getLanguageCode('sr.wikipedia.org'), 'sr');
        assert.equal(wikiLanguage.getLanguageCode('sr.m.wikipedia.org'), 'sr');
        assert.equal(wikiLanguage.getLanguageCode('SR.wikipedia.org'), 'sr');
        assert.equal(wikiLanguage.getLanguageCode('zh.wiktionary.org'), 'zh');
        assert.equal(wikiLanguage.getLanguageCode('es.wikipedia.beta.wmflabs.org'), 'es');
        assert.equal(wikiLanguage.getLanguageCode('www.mediawiki.org'), undefined);
        assert.equal(wikiLanguage.getLanguageCode('wikidata.org'), undefined);
        assert.equal(wikiLanguage.getLanguageCode(''), undefined);
        assert.equal(wikiLanguage.getLanguageCode(undefined), undefined);
    });

    it('returns the right language variant from request object', () => {
        const req = {
            headers: {
                'accept-language': 'en-US,sr-Latn;q=0.8,zh-Hans-CN;q=0.9'
            },
            params: {
                domain: 'zh.wikipedia.org'
            }
        };

        assert.equal(wikiLanguage.relevantLanguageVariantOrCode(req), 'zh-cn');
    });

    it('falls back to language code when accept-language invalid', () => {
        const req = {
            headers: {
                'accept-language': 'zh-Invalid-ok'
            },
            params: {
                domain: 'zh.wikipedia.org'
            }
        };

        assert.equal(wikiLanguage.relevantLanguageVariantOrCode(req), 'zh');
    });

    it('falls back to language code when no accept-language header sent', () => {
        const req = {
            headers: {},
            params: {
                domain: 'zh.wikipedia.org'
            }
        };

        assert.equal(wikiLanguage.relevantLanguageVariantOrCode(req), 'zh');
    });
});
