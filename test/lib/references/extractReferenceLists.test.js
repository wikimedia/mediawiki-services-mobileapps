'use strict';

const assert = require('../../utils/assert.js');
const domino = require('domino');
const lib = require('../../../lib/references/extractReferenceLists');
const extractReferenceLists = lib.extractReferenceLists;
const sinon = require('sinon');

describe('lib:extractReferenceLists', () => {
    let logger;

    beforeEach(() => {
        logger = {
            log: sinon.stub()
        };
    });

    it('empty document', () => {
        const doc = domino.createDocument('');

        const refLists = extractReferenceLists(doc, logger);
        assert.deepEqual(refLists.reference_lists.length, 0);
    });

    it('one list (old)', () => {
        const doc = domino.createDocument('<body>'
            + '<ol typeof="mw:Extension/references" class="mw-references references">'
            + '<li><span>foo A1</span></li>'
            + '<li><span>foo A2</span></li>'
            + '</ol>'
            + '</body>');

        const refLists = extractReferenceLists(doc, logger);
        assert.deepEqual(refLists.reference_lists.length, 1);
    });

    it('one list (new)', () => {
        const doc = domino.createDocument('<body>'
            + '<div typeof="mw:Extension/references">'
            + '<ol class="mw-references references">'
            + '<li><span>foo A1</span></li>'
            + '<li><span>foo A2</span></li>'
            + '</ol>'
            + '<div>'
            + '</body>');

        const refLists = extractReferenceLists(doc, logger);
        assert.deepEqual(refLists.reference_lists.length, 1);
    });

    it('two lists (old)', () => {
        const doc = domino.createDocument('<body>'
            + '<ol typeof="mw:Extension/references" class="mw-references references">'
            + '<li><span>foo B</span></li>'
            + '</ol>'
            + '<ol typeof="mw:Extension/references" class="mw-references references">'
            + '</ol>'
            + '</body>');

        const refLists = extractReferenceLists(doc, logger);
        assert.deepEqual(refLists.reference_lists.length, 2);
    });

    it('two lists (new)', () => {
        const doc = domino.createDocument('<body>'
            + '<div typeof="mw:Extension/references">'
            + '<ol class="mw-references references">'
            + '<li><span>foo B</span></li>'
            + '</ol>'
            + '</div>'
            + '<div typeof="mw:Extension/references">'
            + '<ol class="mw-references references">'
            + '</ol>'
            + '</div>'
            + '</body>');

        const refLists = extractReferenceLists(doc, logger);
        assert.deepEqual(refLists.reference_lists.length, 2);
    });

    describe('section headings', () => {
        it('white space ignored', () => {
            assert.ok(!lib.testing.reNonWhiteSpace.test(' '));
            assert.ok(!lib.testing.reNonWhiteSpace.test('\t'));
            assert.ok(!lib.testing.reNonWhiteSpace.test('\r'));
            assert.ok(!lib.testing.reNonWhiteSpace.test('\n'));
        });

        it('only white space around', () => {
            const doc = domino.createDocument(
                '<section data-mw-section-id="1">'
                + '<h2 id="References"> References </h2>'
                + ' \t\r\n'
                + '<div typeof="mw:Extension/references">'
                + '<ol class="mw-references references">'
                + '<li><span>foo</span></li>'
                + '</ol>'
                + '</div>'
                + '\n'
                + '</section>');

            const refLists = extractReferenceLists(doc, logger);
            assert.deepEqual(refLists.reference_lists.length, 2);
            assert.deepEqual(refLists.reference_lists[0], {
                type: 'section_heading',
                id: 'References',
                html: 'References'
            });
        });

        it('with extra text before', () => {
            const doc = domino.createDocument(
                '<section data-mw-section-id="1">'
                + '<h2 id="References"> References </h2>'
                + 'some other text before'
                + '<div typeof="mw:Extension/references">'
                + '<ol class="mw-references references">'
                + '<li><span>foo</span></li>'
                + '</ol>'
                + '</div>'
                + '</section>');

            const refLists = extractReferenceLists(doc, logger);
            assert.deepEqual(refLists.reference_lists.length, 1);
            assert.deepEqual(refLists.reference_lists[0].type, 'reference_list');
        });

        it('with extra text after', () => {
            const doc = domino.createDocument(
                '<section data-mw-section-id="1">'
                + '<h2 id="References"> References </h2>'
                + '<div typeof="mw:Extension/references">'
                + '<ol class="mw-references references">'
                + '<li><span>foo</span></li>'
                + '</ol>'
                + '</div>'
                + 'some other text after'
                + '</section>');

            const refLists = extractReferenceLists(doc, logger);
            assert.deepEqual(refLists.reference_lists.length, 1);
            assert.deepEqual(refLists.reference_lists[0].type, 'reference_list');
        });

        it('nested section only adds direct parent', () => {
            const doc = domino.createDocument(
                '<section data-mw-section-id="20">'
                + '<h2 id="Notes_and_references"> Notes and references </h2>'
                + '<section data-mw-section-id="21">'
                + '<h3 id="Notes"> Notes </h3>'
                + '\n'
                + '<div typeof="mw:Extension/references">'
                + '<ol class="mw-references references">'
                + '<li><span>Some note</span></li>'
                + '</ol>'
                + '</div>'
                + '\n'
                + '</section>'
                + '<section data-mw-section-id="22">'
                + '<h3 id="References"> References </h3>'
                + '\n'
                + '<div typeof="mw:Extension/references">'
                + '<ol class="mw-references references">'
                + '<li><span>Some reference</span></li>'
                + '</ol>'
                + '</div>'
                + '\n'
                + '</section>'
                + '</section>');

            const refLists = extractReferenceLists(doc, logger);
            assert.deepEqual(refLists.reference_lists.length, 4);
            assert.deepEqual(refLists.reference_lists[0], {
                type: 'section_heading',
                id: 'Notes',
                html: 'Notes'
            });
            assert.deepEqual(refLists.reference_lists[1].type,
                'reference_list');
            assert.deepEqual(refLists.reference_lists[2], {
                type: 'section_heading',
                id: 'References',
                html: 'References'
            });
            assert.deepEqual(refLists.reference_lists[3].type,
                'reference_list');
        });
    });
});
