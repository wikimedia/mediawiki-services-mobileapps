'use strict';

const assert = require('../../utils/assert.js');
const domino = require('domino');
const extractReferenceLists = require('../../../lib/references/extractReferenceLists');
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
        assert.deepEqual(refLists.structure.length, 0);
    });

    it('one list (old)', () => {
        const doc = domino.createDocument('<body>'
            + '<ol typeof="mw:Extension/references" class="mw-references references">'
            + '<li><span>foo A1</span></li>'
            + '<li><span>foo A2</span></li>'
            + '</ol>'
            + '</body>');

        const refLists = extractReferenceLists(doc, logger);
        assert.deepEqual(refLists.structure.length, 1);
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
        assert.deepEqual(refLists.structure.length, 1);
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
        assert.deepEqual(refLists.structure.length, 2);
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
        assert.deepEqual(refLists.structure.length, 2);
    });

});
