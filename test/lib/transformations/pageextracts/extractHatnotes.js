/* eslint-disable max-len */

'use strict';

const domino = require('domino');
const assert = require('./../../../utils/assert.js');
const extractHatnotesForMobileSections = require('./../../../../lib/transforms').extractHatnotesForMobileSections;
const extractHatnotesForMetadata = require('./../../../../lib/transforms').extractHatnotesForMetadata;

function testMetadataResult(doc, expected) {
    const result = extractHatnotesForMetadata(doc);
    if (expected) {
        for (let i = 0; i < expected.length; i++) {
            assert.deepEqual(result.section, expected.section);
            assert.deepEqual(result.html, expected.html);
            assert.deepEqual(result.text, expected.text);
        }
    } else {
        assert.deepEqual(expected, result);
    }
}

function testMobileSectionsResult(doc, expected) {
    const result = extractHatnotesForMobileSections(doc);
    if (expected) {
        for (let i = 0; i < expected.length; i++) {
            assert.deepEqual(result[i], expected[i]);
            assert.deepEqual(result[i], expected[i]);
        }
    } else {
        assert.deepEqual(expected, result);
    }
}

function testMobileSectionsNoRemoveAfterHtml(doc, expected) {
    extractHatnotesForMobileSections(doc, false);
    assert.deepEqual(doc.outerHTML, expected);
}

function testMobileSectionsRemoveAfterHtml(doc, expected) {
    extractHatnotesForMobileSections(doc, true);
    assert.deepEqual(doc.outerHTML, expected);
}

describe('extractHatnotes', () => {
    it('.hatnote element', () => {
        const html = '<html><head></head><body><section data-mw-section-id="0"><div class="hatnote">Here is a <b>hatnote</b></div></section></body></html>';
        const afterRemoveHtml = '<html><head></head><body><section data-mw-section-id="0"></section></body></html>';
        const doc = domino.createDocument(html);
        testMetadataResult(doc, [ { section: 0, html: 'Here is a <b>hatnote</b>', text: 'Here is a hatnote' } ]);
        testMobileSectionsResult(doc, [ 'Here is a <b>hatnote</b>' ]);
        testMobileSectionsNoRemoveAfterHtml(doc, html);
        testMobileSectionsRemoveAfterHtml(doc, afterRemoveHtml);
    });

    it('.dablink element', () => {
        const html = '<html><head></head><body><section data-mw-section-id="0"><div class="dablink">Here is a <b>disambiguation hatnote</b></div></section></body></html>';
        const afterRemoveHtml = '<html><head></head><body><section data-mw-section-id="0"></section></body></html>';
        const doc = domino.createDocument(html);
        testMetadataResult(doc, [ { section: 0, html: 'Here is a <b>disambiguation hatnote</b>', text: 'Here is a disambiguation hatnote' } ]);
        testMobileSectionsResult(doc, [ 'Here is a <b>disambiguation hatnote</b>' ]);
        testMobileSectionsNoRemoveAfterHtml(doc, html);
        testMobileSectionsRemoveAfterHtml(doc, afterRemoveHtml);
    });

    it('hatnote not in lead section', () => {
        const html = '<html><head></head><body><section data-mw-section-id="0">Foo</section><section data-mw-section-id="1"><div class="hatnote">Hatnote in <b>section 1</b></div></section></body></html>';
        const afterRemoveHtml = html;
        const doc = domino.createDocument(html);
        testMetadataResult(doc, [ { section: 1, html: 'Hatnote in <b>section 1</b>', text: 'Hatnote in section 1' } ]);
        testMobileSectionsResult(doc, undefined);
        testMobileSectionsNoRemoveAfterHtml(doc, html);
        testMobileSectionsRemoveAfterHtml(doc, afterRemoveHtml);
    });

    it('multiple hatnotes', () => {
        const html = '<html><head></head><body><section data-mw-section-id="0"><div class="hatnote">Hatnote in <b>section 0</b></div></section><section data-mw-section-id="3"><div class="hatnote">Hatnote in <b>section 3</b></div></section></body></html>';
        const afterRemoveHtml = '<html><head></head><body><section data-mw-section-id="0"></section><section data-mw-section-id="3"><div class="hatnote">Hatnote in <b>section 3</b></div></section></body></html>';
        const doc = domino.createDocument(html);
        testMetadataResult(doc, [
            { section: 0, html: 'Hatnote in <b>section 0</b>', text: 'Hatnote in section 0' },
            { section: 3, html: 'Hatnote in <b>section 3</b>', text: 'Hatnote in section 3' }
        ]);
        testMobileSectionsResult(doc, [ 'Hatnote in <b>section 0</b>' ]);
        testMobileSectionsNoRemoveAfterHtml(doc, html);
        testMobileSectionsRemoveAfterHtml(doc, afterRemoveHtml);
    });

    it('no hatnotes', () => {
        const html = '<html><head></head><body><section data-mw-section-id="0">Foo</section></body></html>';
        const doc = domino.createDocument(html);
        testMetadataResult(doc, undefined);
        testMobileSectionsResult(doc, undefined);
        testMobileSectionsNoRemoveAfterHtml(doc, html);
        testMobileSectionsRemoveAfterHtml(doc, html);
    });
});
