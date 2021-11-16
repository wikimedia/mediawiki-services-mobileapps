'use strict';

const domino = require('domino');
const assert = require('../../utils/assert');
const parseSpoken = require('../../../lib/parseProperty').parseSpokenWikipedia;

function test(html, expected) {
	const doc = domino.createDocument(html);
	const result = parseSpoken(doc);
	if (expected) {
		assert.deepEqual(result.files.length, expected.files.length);
		for (let i = 0; i < expected.length; i++) {
			assert.deepEqual(result.files[i], expected.files[i]);
		}
	} else {
		assert.deepEqual(result, expected);
	}
}

describe('lib:parseSpokenWikipedia', () => {
	it('one spoken file', () => {
		const html = '<div class="spoken-wikipedia"><audio><source src="/path/to/Bill_Clinton (spoken article).ogg"></audio></div>';
		test(html, { files: [ 'File:Bill Clinton (spoken article).ogg' ] });
	});

	it('multiple spoken files', () => {
		const html = '<div class="spoken-wikipedia"><audio><source src="Douglas_Adams_Part_1.ogg"/></audio><audio><source src="Douglas_Adams_Part_2.ogg"/></audio></div>';
		test(html, { files: [
			'File:Douglas_Adams_Part_1.ogg',
			'File:Douglas_Adams_Part_2.ogg'
		] });
	});

	it('no spoken files', () => {
		test('<p>Foo</p>', undefined);
	});
});
