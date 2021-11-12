'use strict';

const assert = require('../../utils/assert');
const createDocument = require('domino').createDocument;
const parseExample = require('../../../lib/definitions/parseExample');

describe('lib:definitions:parseExamples', () => {

	describe('formatted with microformats', () => {
		it('extracts usage examples', () => {
			const element = createDocument('<div class="h-usage-example">' +
                '<span class="e-example">Example</span>' +
                '<span class="e-translation">Translation</span>' +
                '<span class="e-literally">Literally</span>' +
                '</div>');

			const example = parseExample('en', element);

			assert.deepEqual(example, {
				example: 'Example',
				translation: 'Translation',
				literally: 'Literally',
			});
		});
	});

	describe('formatted with plain MediaWiki markup', () => {
		it('extracts usage examples', () => {
			const element = createDocument(
				'<dl>' +
                '   <dd id="example"><i id="mw1234">Example</i>' +
                '       <dl>' +
                '           <dd>Translation</dd>' +
                '       </dl>' +
                '   </dd>' +
                '</dl>'
			);

			const examples = parseExample('en', element.getElementById('example'));

			assert.deepEqual(examples, {
				example: '<i>Example</i>',
				translation: 'Translation',
			});
		});
	});
});
