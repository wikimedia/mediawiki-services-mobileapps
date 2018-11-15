'use strict';

const domino = require('domino');
const assert = require('../../../utils/assert');
const stripGermanIPA = require('../../../../lib/transforms').stripGermanIPA;

describe('lib:stripGermanIPA', () => {
    // de.wikipedia.org/api/rest_v1/page/html/Roger_Federer
    it('removes German IPA text (outer text)', () => {
        const doc = domino.createDocument(
            'Title [' +
            '<span class="IPA">' +
            '<a href="./Liste_der_IPA-Zeichen"><span>ˈrɔdʒər ˈfɛdərər</span></a>' +
            '</span>]<sup>[2]</sup>');
        stripGermanIPA(doc);
        assert.deepEqual(doc.body.innerHTML, 'Title <sup>[2]</sup>');
    });
    // de.wikipedia.org/api/rest_v1/page/html/Otto_Warmbier/172386373
    it('removes German IPA text (outer text, Placeholder)', () => {
        const doc = domino.createDocument(
            'Title [' +
            '<span typeof="mw:Placeholder">' +
            '<span class="IPA">' +
            '<a href="./Liste_der_IPA-Zeichen"><span>ˈɒtɔ ˈwə̆ɹmbiə̯ɹ</span></a>' +
            '</span>' +
            '</span>] (* born');
        stripGermanIPA(doc);
        assert.deepEqual(doc.body.innerHTML, 'Title  (* born');
    });
    // https://de.wikipedia.org/api/rest_v1/page/html/Niedersachsen/172984059
    it('removes German IPA text (outer span)', () => {
        const doc = domino.createDocument(
            '<span typeof="mw:Entity">[</span>' +
            '<span class="IPA">' +
            '<a href="./Liste_der_IPA-Zeichen"><span>ˈniːdɐzaksn̩</span></a>' +
            '</span>' +
            '<span typeof="mw:Entity">]</span>');
        stripGermanIPA(doc);
        assert.deepEqual(doc.body.innerHTML,
            '<span typeof="mw:Entity"></span><span typeof="mw:Entity"></span>');
    });
});
