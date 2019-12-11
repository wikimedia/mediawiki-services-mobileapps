/* eslint-disable prefer-template */

'use strict';

const assert = require('../../../utils/assert.js');
const domino = require('domino');
const sinon = require('sinon');
const parsoidSections = require('../../../../lib/sections/parsoidSections');
const shouldWarn = parsoidSections.testing.shouldLogInvalidSectionNotice;
const validatePreviousSection = parsoidSections.testing.validatePreviousSection;

describe('lib:parsoid-sections (section elements)', function() {

    this.timeout(20000);

    function assertSection0(sections, extraText = '') {
        assert.deepEqual(sections[0].id, 0);
        assert.deepEqual(sections[0].text, `text0${extraText}`, JSON.stringify(sections[0], null, 2));
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
        const doc = domino.createDocument('');
        const sections = parsoidSections.getSectionsText(doc);
        assert.deepEqual(sections.length, 1);
        assert.deepEqual(sections[0].id, 0);
        assert.deepEqual(sections[0].text, '');
    });

    it('getSectionsText() with just text should produce a lead section', () => {
        const doc = domino.createDocument('<section data-mw-section-id="0">text0</section>');
        const sections = parsoidSections.getSectionsText(doc);
        assert.deepEqual(sections.length, 1);
        assertSection0(sections);
    });

    it('getSectionsText() with one h2 should produce two sections', () => {
        const doc = domino.createDocument('<section data-mw-section-id="0">text0</section>' +
            '<section data-mw-section-id="1"><h2 id="foo">foo</h2>text1</section>');
        const sections = parsoidSections.getSectionsText(doc);
        assert.deepEqual(sections.length, 2);
        assertSection0(sections);
        assertSection1(sections);
    });

    it('getSectionsText() with one h2 and h3 should produce three sections', () => {
        const doc = domino.createDocument('<section data-mw-section-id="0">text0</section>' +
            '<section data-mw-section-id="1"><h2 id="foo">foo</h2>text1' +
            '<section data-mw-section-id="2">' +
            '<h3 id="Funny_section_.21.40.23.24">Funny section !@#$%^&*()</h3>text2' +
            '</section></section>');
        const sections = parsoidSections.getSectionsText(doc);
        assert.deepEqual(sections.length, 3);
        assertSection0(sections);
        assertSection1(sections);
        assertSection2(sections);
    });

    // From T209158: Lead section with heading inside
    it('getSectionsText() with h2 inside lead should produce one section', () => {
        const doc = domino.createDocument('<section data-mw-section-id="0">text0' +
            '<h2 id="foo">foo</h2>text1' +
            '</section>');
        const sections = parsoidSections.getSectionsText(doc);
        assert.deepEqual(sections.length, 1);
        assertSection0(sections, '<h2 id="foo">foo</h2>text1');
    });

    // From T175305 http://localhost:8000/fy.wikipedia.org/v3/page/html/De_Kanto%27s
    it('getSectionsText() with one h2 inside div should not produce another section', () => {
        const sectionInDiv = '<div style="position:absolute;visibility:hidden;height:0;">' +
            '<section data-mw-section-id="-1"><h2 id="bar">bar</h2></section></div>';
        const doc = domino.createDocument('<section data-mw-section-id="0">text0</section>' +
            '<section data-mw-section-id="1"><h2 id="foo">foo</h2>text1' + sectionInDiv +
            '</section>');
        const sections = parsoidSections.getSectionsText(doc);
        assert.deepEqual(sections.length, 2);
        assertSection0(sections);
        assertSection1(sections, sectionInDiv);
    });

    // same as above but using h3 instead of h2 in extra <div>
    it('getSectionsText() with one h3 inside div should not produce another section', () => {
        const sectionInDiv = '<div style="position:absolute;visibility:hidden;height:0;">' +
            '<section data-mw-section-id="-1"><h3 id="bar">bar</h3></section></div>';
        const doc = domino.createDocument('<section data-mw-section-id="0">text0</section>' +
            '<section data-mw-section-id="1"><h2 id="foo">foo</h2>text1' + sectionInDiv +
            '</section>');
        const sections = parsoidSections.getSectionsText(doc);
        assert.deepEqual(sections.length, 2);
        assertSection0(sections);
        assertSection1(sections, sectionInDiv);
    });

    it('section inside lead section should not be part of lead section', () => {
        const sectionNotInDiv = '<section data-mw-section-id="1"><h2>Foo</h2>text1</section>';
        const doc = domino.createDocument(
            '<section data-mw-section-id="0">text0' +
            sectionNotInDiv +
            '</section>'
        );
        const sections = parsoidSections.getSectionsText(doc);
        assert.deepEqual(sections.length, 2);
        assertSection0(sections);
    });

    it('div/section inside lead section should be part of lead section', () => {
        const sectionInDiv = '<div>' +
            '<section data-mw-section-id="1"><h2>Foo</h2>text1</section></div>';
        const doc = domino.createDocument(
            '<section data-mw-section-id="0">text0' +
            sectionInDiv +
            '</section>'
        );
        const sections = parsoidSections.getSectionsText(doc);
        assert.deepEqual(sections.length, 1);
        assertSection0(sections, sectionInDiv);
    });

    it('should not warn for page containing only a lead section', () => {
        const allSections = [ { id: 0 } ];
        assert.ok(!shouldWarn(allSections[0]));
    });

    it('should warn for non-lead section without heading properties', () => {
        const allSectionsWithoutHeadingProps = [ { id: 0 }, { id: 1 } ];
        assert.ok(shouldWarn(allSectionsWithoutHeadingProps[1]));
    });

    it('should not warn if id & anchor are found for all sections after the lead section', () => {
        const allSections = [ { id: 0 }, { id: 1, line: 'Foo', anchor: 'Foo' } ];
        assert.ok(!shouldWarn(allSections[1]));
    });

    it('should not warn for non-lead non-editable section without heading properties', () => {
        const allSections = [ { id: 0 }, { id: -1 } ];
        assert.ok(!shouldWarn(allSections[1]));
    });

    it('should not warn if a non-editable section precedes the true lead section', () => {
        const allSections = [ { id: -1 }, { id: 0 }, { id: 1, line: 'Foo', anchor: 'Foo' } ];
        assert.ok(!shouldWarn(allSections[1]));
    });

    it('should throw if sectionObj is invalid', () => {
        assert.throws(() => {
            shouldWarn(undefined);
        }, /TypeError/);
    });

    it('validatePreviousSection should log a warning if appropriate', () => {
        const logger = {
            log: sinon.stub()
        };
        const allSectionsWarn = [ { id: 0 }, { id: 1 } ];

        validatePreviousSection(logger, allSectionsWarn);
        assert.ok(logger.log.calledOnce);
        assert.deepEqual(logger.log.args,
            [[ 'debug/sectioning', {
                msg: 'Cannot find heading for section',
                section_number: 1
            }]]);
    });

    it('non-editable sections are flagged', () => {
        const doc = domino.createDocument(
            '<section data-mw-section-id="0"><p>text0</p></section>' +
            '<section data-mw-section-id="-1"><h2 id="foo">foo</h2>text1</section>' +
            '<section data-mw-section-id="-2"><h2 id="bar">bar</h2>text2</section>');
        const sections = parsoidSections.getSectionsText(doc);
        assert.deepEqual(sections[0].noedit, undefined);
        assert.ok(sections[1].noedit);
        assert.ok(sections[2].noedit);
    });

    describe('justLeadSection', () => {

        function test(html, expected) {
            return parsoidSections.createDocumentFromLeadSection(html)
            .then((result) => {
                assert.deepEqual(result.body.innerHTML, expected);
            });
        }

        it('should just return the first section', () => {
            test(
                '<section data-mw-section-id="0"><p>section 0</p></section>' +
                '<section data-mw-section-id="1"><h2 id="foo">foo</h2>section 1</section>',
                '<p>section 0</p>'
            );
        });

        it('should skip non-editable section', () => {
            test(
                '<section data-mw-section-id="-1"><p>section -1</p></section>' +
                '<section data-mw-section-id="0"><p>section 0</p></section>' +
                '<section data-mw-section-id="1"><h2 id="foo">section 1</h2>section 1</section>',
                '<p>section 0</p>'
            );
        });

        it('should return empty string if no lead section exists', () => {
            test('<section data-mw-section-id="-1"><p>section -1</p></section>', '');
        });

        it('should skip malformed section tag with no data-mw-section-id', () => {
            test(
                '<section><p>data-mw-section-id foo 0</p></section>' +
                '<section data-mw-section-id="0"><p>section 0</p></section>',
                '<p>section 0</p>'
            );
        });

        it('should ignore data-mw-section-id multiples of 10', () => {
            test(
                '<section data-mw-section-id="-1"><p>section -1</p></section>' +
                '<section data-mw-section-id="10"><p>section 10</p></section>',
                ''
            );
        });
    });
});
