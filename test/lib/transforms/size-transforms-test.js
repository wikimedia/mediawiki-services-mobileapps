'use strict';

const assert = require('../../utils/assert.js');
const domino = require('domino');
const transforms = require('../../../lib/transforms');

describe('lib:size-transforms', () => {
    it('rmBracketSpans should remove the spans around brackets', () => {
        const doc = domino.createDocument('<a><span>[</span>1<span>]</span></a>');
        transforms.rmBracketSpans(doc);
        assert.deepEqual(doc.body.innerHTML, '<a>[1]</a>');
    });

    it('rmElements should remove the spans with style="display:none"', () => {
        const doc = domino.createDocument('<span style="display:none">foo</span>');
        transforms.rmElements(doc, 'span[style="display:none"]');
        assert.deepEqual(doc.body.innerHTML, '');
    });
});
