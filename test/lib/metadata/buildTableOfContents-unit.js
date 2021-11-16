'use strict';

const domino = require('domino');
const assert = require('../../utils/assert');
const buildTocEntries = require('../../../lib/metadata').testing.buildTocEntries;

const doc = `
    <section data-mw-section-id="0">Foo</section>
    <section data-mw-section-id="1" id="Foo"><h2>Foo</h2></section>
    <section data-mw-section-id="2" id="Foo"><h3>Foo</h3></section>
    <section data-mw-section-id="-1" id="Foo"><h5>Foo</h5></section>
    <section data-mw-section-id="3" id="Foo"><h4>Foo</h4></section>
    <section data-mw-section-id="4" id="Foo"><h3>Foo</h3></section>
    <section data-mw-section-id="-2" id="Foo"><h5>Foo</h5></section>
    <section data-mw-section-id="5" id="Foo"><h4>Foo</h4></section>
    <section data-mw-section-id="6" id="Foo"><h3>Foo</h3></section>
    <section data-mw-section-id="7" id="Foo"><h2>Foo</h2></section>
`;

describe('lib:metadata buildTableOfContents', () => {
	it('should have same form as MediaWiki parser-generated TOC', () => {
		const result = buildTocEntries(domino.createDocument(doc), {});
		const expectedNumbers = ['1', '1.1', '1.1.1', '1.2', '1.2.1', '1.3', '2'];
		assert.deepEqual(result.length, 7, 'result should have 7 entries (3 excluded)');
		assert.deepEqual(result.length, expectedNumbers.length);
		for (let i = 0; i < expectedNumbers.length; i++) {
			assert.deepEqual(result[i].number, expectedNumbers[i]);
		}
	});
});
