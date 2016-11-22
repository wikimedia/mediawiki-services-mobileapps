/* eslint-env mocha */

'use strict';

const assert = require('../../utils/assert');
const domino = require('domino');
const fs = require('fs');
const NEWS_SITES = require('../../../etc/feed/news-sites');

describe('news headline selectors', function() {
    this.timeout(20000); // eslint-disable-line no-invalid-this

    /**
     * @param {!string} lang
     * @return {!Document}
    */
    function readTestDoc(lang) {
        const timestamp = '2016-11-30';
        const filename = `test/fixtures/news-site-${lang}-${timestamp}.htm`;
        const html = fs.readFileSync(filename);
        return domino.createDocument(html);
    }

    for (const lang of Object.keys(NEWS_SITES)) {
        it(`${lang} news headlines should be general not categorical`, () => {
            const doc = readTestDoc(lang);
            const headlines = doc.querySelectorAll(NEWS_SITES[lang].headlineSelectorAll);
            assert.closeTo(headlines.length, 5, 3);
        });

        it(`${lang} news headline topics should be nonnull`, () => {
            const doc = readTestDoc(lang);
            const headlines = doc.querySelectorAll(NEWS_SITES[lang].headlineSelectorAll);
            const topic = headlines[0].querySelector(NEWS_SITES[lang].topicAnchorSelector);
            assert.ok(topic !== null);
        });
    }

    it(`news headline topic should be the first bold link`, () => {
        const lang = 'en';
        const doc = readTestDoc(lang);
        const headlines = doc.querySelectorAll(NEWS_SITES[lang].headlineSelectorAll);
        const topic = headlines[0].querySelector(NEWS_SITES[lang].topicAnchorSelector);
        assert.equal(topic.getAttribute('href'), './LaMia_Airlines_Flight_2933');
    });

    it(`news headline topic should be the first link when no link is bolded`, () => {
        const lang = 'es';
        const doc = readTestDoc(lang);
        const headlines = doc.querySelectorAll(NEWS_SITES[lang].headlineSelectorAll);
        const topic = headlines[0].querySelector(NEWS_SITES[lang].topicAnchorSelector);
        assert.equal(topic.getAttribute('href'), './Vuelo_2933_de_LaMia');
    });
});
