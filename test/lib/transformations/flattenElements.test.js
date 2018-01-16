"use strict";

const domino = require('domino');
const assert = require('./../../utils/assert.js');
const flattenElements = require('./../../../lib/transformations/flattenElements');

describe('lib:flattenElements', () => {
    it('replaces a with span, keeps class attribute', () => {
        const document = domino.createDocument('<a class="bar" href="#">foo</a>');
        flattenElements(document, 'a');
        assert.deepEqual(document.body.innerHTML, '<span class="bar">foo</span>');
    });

    it('replaces a with span, keeps style attribute', () => {
        const document = domino.createDocument('<a style="bar" href="#">foo</a>');
        flattenElements(document, 'a');
        assert.deepEqual(document.body.innerHTML, '<span style="bar">foo</span>');
    });

    it('replaces a tag with plain text if no attributes to keep', () => {
        const document = domino.createDocument('<a href="#">foo</a>');
        flattenElements(document, 'a');
        assert.deepEqual(document.body.innerHTML, 'foo');
    });
});
