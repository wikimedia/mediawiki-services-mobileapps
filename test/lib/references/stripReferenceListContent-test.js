'use strict';

const assert = require('../../utils/assert.js');
const domino = require('domino');
const stripReferenceListContent = require('../../../lib/references/stripReferenceListContent');

describe('lib:strip reference list transform', () => {
    it('reference list contents should be replaced by placeholders (old)', () => {
        const doc = domino.createDocument('<body>'
            + '<ol typeof="mw:Extension/references" class="mw-references references">'
            + '<li><span>foo A1</span></li>'
            + '<li><span>foo A2</span></li>'
            + '</ol>'
            + '<ol typeof="mw:Extension/references" class="mw-references references">'
            + '<li><span>foo B</span></li>'
            + '</ol>'
            + '<ol typeof="mw:Extension/references" class="mw-references references">'
            + '</ol>'
            + '</body>');

        stripReferenceListContent(doc);
        assert.selectorExistsNTimes(doc, 'ol', 0, 'expected <ol> tags to be removed');
        assert.selectorExistsNTimes(doc, 'li', 0, 'expected <li> tags to be removed');
        assert.selectorExistsNTimes(doc, 'div', 3, 'expected 3 <div> tags to be found');
    });
    it('reference list contents should be replaced by placeholders (new)', () => {
        const doc = domino.createDocument('<body>'
            + '<div typeof="mw:Extension/references">'
            + '<ol class="mw-references references">'
            + '<li><span>foo A1</span></li>'
            + '<li><span>foo A2</span></li>'
            + '</ol>'
            + '</div>'
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

        stripReferenceListContent(doc);
        assert.selectorExistsNTimes(doc, 'ol', 0, 'expected <ol> tags to be removed');
        assert.selectorExistsNTimes(doc, 'li', 0, 'expected <li> tags to be removed');
        assert.selectorExistsNTimes(doc, 'div', 3, 'expected 3 <div> tags to be found');
    });
});
