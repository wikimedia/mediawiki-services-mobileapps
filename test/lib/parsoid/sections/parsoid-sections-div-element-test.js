'use strict';

const assert = require('../../../utils/assert.js');
const domino = require('domino');
const parsoid = require('../../../../lib/sections/parsoidSections');

describe('lib:parsoid-sections (div elements)', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    function assertSection0(sections) {
        assert.deepEqual(sections[0].id, 0);
        assert.deepEqual(sections[0].text, 'text0', JSON.stringify(sections[0], null, 2));
    }

    function assertSection1(sections, extraText = '') {
        assert.deepEqual(sections[1].id, 1);
        assert.deepEqual(sections[1].toclevel, 1);
        assert.deepEqual(sections[1].line, 'foo');
        assert.deepEqual(sections[1].anchor, 'foo');
        assert.deepEqual(sections[1].text, `text1${extraText}`);
    }

    function assertSection2(sections) {
        assert.deepEqual(sections[2].id, 2);
        assert.deepEqual(sections[2].toclevel, 2);
        // assert.deepEqual(sections[2].line, 'Funny section !@#$');
        assert.deepEqual(sections[2].anchor, 'Funny_section_.21.40.23.24');
        assert.deepEqual(sections[2].text, 'text2');
    }


    it('getSectionsText(empty) should produce an empty lead section', () => {
        const doc = domino.createDocument('<body></body>');
        parsoid.addSectionDivs(doc);
        const sections = parsoid.getSectionsText(doc);
        assert.deepEqual(sections.length, 1);
        assert.deepEqual(sections[0].id, 0);
        assert.deepEqual(sections[0].text, '');
    });

    it('getSectionsText() with just text should produce a lead section', () => {
        const doc = domino.createDocument('<body>text0</body>');
        parsoid.addSectionDivs(doc);
        const sections = parsoid.getSectionsText(doc);
        assert.deepEqual(sections.length, 1);
        assertSection0(sections);
    });

    it('getSectionsText() with one h2 should produce two sections', () => {
        const doc = domino.createDocument('<body>text0<h2 id="foo">foo</h2>text1</body>');
        parsoid.addSectionDivs(doc);
        const sections = parsoid.getSectionsText(doc);
        assert.deepEqual(sections.length, 2);
        assertSection0(sections);
        assertSection1(sections);
    });

    it('getSectionsText() with one h2 and h3 should produce three sections', () => {
        const doc = domino.createDocument('<body>text0' +
            '<h2 id="foo">foo</h2>text1' +
            '<h3 id="Funny_section_.21.40.23.24">Funny section !@#$%^&*()</h3>text2' +
            '</body>');
        parsoid.addSectionDivs(doc);
        const sections = parsoid.getSectionsText(doc);
        assert.deepEqual(sections.length, 3);
        assertSection0(sections);
        assertSection1(sections);
        assertSection2(sections);
    });

    // From T175305 http://localhost:6927/fy.wikipedia.org/v1/page/mobile-sections/De_Kanto%27s
    it('getSectionsText() with one h2 inside div should not produce another section', () => {
        const extraText = '<div><h2 id="bar">bar</h2></div><p>text 2</p>';
        const doc = domino.createDocument(
            `<body>text0<h2 id="foo">foo</h2>text1${extraText}</body>`);
        parsoid.addSectionDivs(doc);
        const sections = parsoid.getSectionsText(doc);
        assert.deepEqual(sections.length, 2);
        assertSection0(sections);
        assertSection1(sections, extraText);
    });

    // same as above but using h3 instead of h2 in extra <div>
    it('getSectionsText() with one h3 inside div should not produce another section', () => {
        const extraText = '<div><h3 id="bar">bar</h3></div><p>text 2</p>';
        const doc = domino.createDocument(
            `<body>text0<h2 id="foo">foo</h2>text1${extraText}</body>`);
        parsoid.addSectionDivs(doc);
        const sections = parsoid.getSectionsText(doc);
        assert.deepEqual(sections.length, 2);
        assertSection0(sections);
        assertSection1(sections, extraText);
    });

    describe('justLeadSection', () => {
        it('should just return the first section', () => {
            const doc = domino.createDocument('<body><p>text0</p>' +
                '<h2 id="foo">foo</h2>text1' +
                '</body>');
            const leadSectionDoc = parsoid.justLeadSection(doc);
            assert.deepEqual(leadSectionDoc.body.innerHTML, '<p>text0</p>');
        });
    });
});
