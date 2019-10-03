/* eslint-disable max-len */

'use strict';

const domino = require('domino');
const assert = require('./../../../utils/assert');
const extractHatnotesForMobileSections = require('./../../../../lib/transforms').extractHatnotesForMobileSections;
const extractHatnotesForMetadata = require('./../../../../lib/transforms').extractHatnotesForMetadata;

function testMetadataResult(doc, lang, expected) {
    const result = extractHatnotesForMetadata(doc, lang);
    if (expected) {
        for (let i = 0; i < expected.length; i++) {
            assert.deepEqual(result.section, expected.section);
            assert.deepEqual(result.html, expected.html);
        }
    } else {
        assert.deepEqual(expected, result);
    }
}

function testMobileSectionsResult(doc, lang, expected) {
    const result = extractHatnotesForMobileSections(doc, lang);
    if (expected) {
        for (let i = 0; i < expected.length; i++) {
            assert.deepEqual(result[i], expected[i]);
            assert.deepEqual(result[i], expected[i]);
        }
    } else {
        assert.deepEqual(expected, result);
    }
}

function testMobileSectionsNoRemoveAfterHtml(doc, lang, expected) {
    extractHatnotesForMobileSections(doc, lang, false);
    assert.deepEqual(doc.outerHTML, expected);
}

describe('extractHatnotes', () => {
    it('.hatnote element', () => {
        const html = '<html><head></head><body><section data-mw-section-id="0"><div class="hatnote">Here is a <b>hatnote</b></div></section></body></html>';
        const doc = domino.createDocument(html);
        testMetadataResult(doc, 'en', [ { section: 0, html: 'Here is a <b>hatnote</b>' } ]);
        testMobileSectionsResult(doc, 'en', [ 'Here is a <b>hatnote</b>' ]);
        testMobileSectionsNoRemoveAfterHtml(doc, 'en', html);
    });

    it('.dablink element', () => {
        const html = '<html><head></head><body><section data-mw-section-id="0"><div class="dablink">Here is a <b>disambiguation hatnote</b></div></section></body></html>';
        const doc = domino.createDocument(html);
        testMetadataResult(doc, 'en', [ { section: 0, html: 'Here is a <b>disambiguation hatnote</b>' } ]);
        testMobileSectionsResult(doc, 'en', [ 'Here is a <b>disambiguation hatnote</b>' ]);
        testMobileSectionsNoRemoveAfterHtml(doc, 'en', html);
    });

    it('hatnote not in lead section', () => {
        const html = '<html><head></head><body><section data-mw-section-id="0">Foo</section><section data-mw-section-id="1"><div class="hatnote">Hatnote in <b>section 1</b></div></section></body></html>';
        const doc = domino.createDocument(html);
        testMetadataResult(doc, 'en', [ { section: 1, html: 'Hatnote in <b>section 1</b>' } ]);
        testMobileSectionsResult(doc, 'en', undefined);
        testMobileSectionsNoRemoveAfterHtml(doc, 'en', html);
    });

    it('multiple hatnotes', () => {
        const html = '<html><head></head><body><section data-mw-section-id="0"><div class="hatnote">Hatnote in <b>section 0</b></div></section><section data-mw-section-id="3"><div class="hatnote">Hatnote in <b>section 3</b></div></section></body></html>';
        const doc = domino.createDocument(html);
        testMetadataResult(doc, 'en', [
            { section: 0, html: 'Hatnote in <b>section 0</b>' },
            { section: 3, html: 'Hatnote in <b>section 3</b>' }
        ]);
        testMobileSectionsResult(doc, 'en', [ 'Hatnote in <b>section 0</b>' ]);
        testMobileSectionsNoRemoveAfterHtml(doc, 'en', html);
    });

    it('no hatnotes', () => {
        const html = '<html><head></head><body><section data-mw-section-id="0">Foo</section></body></html>';
        const doc = domino.createDocument(html);
        testMetadataResult(doc, 'en', undefined);
        testMobileSectionsResult(doc, 'en', undefined);
        testMobileSectionsNoRemoveAfterHtml(doc, 'en', html);
    });

    it('dewiki hatnotes', () => {
        const html = '<html><head></head><body><section data-mw-section-id="0"><table id="Vorlage_Dieser_Artikel"><tbody><tr><td><i>Foo</i></td></tr></tbody></table>Hallo Welt</section></body></html>';
        const doc = domino.createDocument(html);
        testMetadataResult(doc, 'de', { section: 0, html: '<i>Foo</i>' });
        testMobileSectionsResult(doc, 'de', [ '<i>Foo</i>' ]);
        testMobileSectionsNoRemoveAfterHtml(doc, 'de', html);
    });
});
