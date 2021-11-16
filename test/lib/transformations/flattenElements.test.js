'use strict';

const domino = require('domino');
const assert = require('../../utils/assert.js');
const flattenElements = require('../../../lib/transforms').flattenElements;

describe('lib:flattenElements', () => {
	function testFlattenAnchors(input, expected, keepAttributes, dropClasses) {
		const document = domino.createDocument(input);
		flattenElements(document, 'a', keepAttributes, dropClasses);
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

	// en.wikipedia.org/api/rest_v1/page/html/Charles_Darwin/822274022
	it('drops `mw-redirect` class', () => {
		testFlattenAnchors(
			'<a class="mw-redirect">artificial selection</a>',
			'artificial selection',
			[ 'class' ],
			[ 'mw-redirect', 'new' ]
		);
	});

	it('drops `new` class', () => {
		testFlattenAnchors(
			'<a class="new">Something</a>',
			'Something',
			[ 'class' ],
			[ 'mw-redirect', 'new' ]
		);
	});

	it('keeps `foo` class', () => {
		testFlattenAnchors(
			'<a class="foo">Bar</a>',
			'<span class="foo">Bar</span>',
			[ 'class' ],
			[ 'mw-redirect', 'new' ]
		);
	});
});
