"use strict";

const domino = require('domino');
const assert = require('./../../utils/assert.js');
const flattenElements = require('./../../../lib/transformations/flattenElements');

describe('lib:flattenElements', () => {
    function testFlattenAnchors(input, expected) {
        const document = domino.createDocument(input);
        flattenElements(document, 'a');
        assert.deepEqual(document.body.innerHTML, expected);
    }

    it('replaces a with span, keeps class attribute', () => {
        testFlattenAnchors(
            '<a class="bar" href="#">foo</a>',
            '<span class="bar">foo</span>'
        );
    });

    it('replaces a with span, keeps style attribute', () => {
        testFlattenAnchors(
            '<a style="bar" href="#">foo</a>',
            '<span style="bar">foo</span>'
        );
    });

    it('replaces a tag with plain text if no attributes to keep', () => {
        testFlattenAnchors(
            '<a href="#">foo</a>',
            'foo'
        );
    });

    it('retains HTML inside elements', () => {
        testFlattenAnchors(
            '<a><i>The Mummy</i> franchise</a>',
            '<span><i>The Mummy</i> franchise</span>'
        );
    });

    it('does not change the text content of the node', () => {
        testFlattenAnchors(
            '<a>&lt;uh oh&gt;</a>',
            '&lt;uh oh&gt;'
        );
    });
});
