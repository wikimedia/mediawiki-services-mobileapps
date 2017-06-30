'use strict';

const assert = require('../../utils/assert.js');
const domino = require('domino');
const transforms = require('../../../lib/transforms');

describe('lib:strip reference list transform', () => {
    it('reference list contents should be replaced by placeholders', () => {
        const doc = domino.createDocument('<body>'
            + '<ol typeof="mw:Extension/references">'
            + '<li><span>foo A1</span></li>'
            + '<li><span>foo A2</span></li>'
            + '</ol>'
            + '<ol typeof="mw:Extension/references">'
            + '<li><span>foo B</span></li>'
            + '</ol>'
            + '<ol typeof="mw:Extension/references">'
            + '</ol>'
            + '</body>');

        transforms.stripReferenceListContent(doc);
        assert.selectorExistsNTimes(doc, 'ol', 0, `expected <ol> tags to be removed`);
        assert.selectorExistsNTimes(doc, 'li', 0, `expected <li> tags to be removed`);
        assert.selectorExistsNTimes(doc, 'div', 3, `expected 3 <div> tags to be found`);
    });
});
