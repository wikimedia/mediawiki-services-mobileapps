'use strict';

const domino = require('domino');
const assert = require('./../../../utils/assert');
const extractLeadIntroduction = require('./../../../../lib/transforms').extractLeadIntroduction;

describe('extractLeadIntroduction', () => {
	it('isEmptyChild', () => {
		const testCases = [
			// noexcerpt elements are treated as empty nodes and ignored.
			[
				'<p><span class="noexcerpt">A</span>Okay</p>',
				false
			],
			// Elements with noexcerpt children are treated as empty.
			[
				'<p><span class="noexcerpt">B</span></p>',
				true
			]
		];

		testCases.forEach((test, i) => {
			const doc = domino.createDocument(test[0]);
			const isEmpty = extractLeadIntroduction.test.isEmptyChild(doc.querySelector('p'));
			assert.equal(isEmpty, test[1], `test ${ i }`);
		});
	});
	it('matches the spec', () => {
		const testCases = [
			// noexcerpt elements are treated as empty nodes and ignored.
			[
				'<p><span class="noexcerpt">Fail</span></p><p>Pass</p>',
				'<p>Pass</p>'
			],
			// Elements with noexcerpt children and others are retained.
			// The noexcerpt will be filtered out from the paragraph later.
			[
				'<p><span class="noexcerpt">Hidden</span>Pass2</p><p>Fail3</p>',
				'<p><span class="noexcerpt">Hidden</span>Pass2</p>'
			],
			// Skip empty paragraph
			[
				'<p></p>',
				''
			],
			// Only the first paragraph is selected
			[
				'<p>One</p><p>Two</p>',
				'<p>One</p>'
			],
			// Text nodes and children (e.g. b tags) are included in the intro
			[
				'<p><b>Colombo Airport</b> may refer to:</p>',
				'<p><b>Colombo Airport</b> may refer to:</p>'
			],
			// Lists are included in the lead intro
			[
				'<p><b>Colombo Airport</b> may refer to:</p><ul><li>item</li></ul>',
				'<p><b>Colombo Airport</b> may refer to:</p><ul><li>item</li></ul>'
			],
			// Tables are not part of the lead introduction.
			[
				'<p><b>Colombo Airport</b> may refer to:</p><ul><li>item</li></ul>' +
                  '<table><tr><td>Text</td></tr></table>',
				'<p><b>Colombo Airport</b> may refer to:</p><ul><li>item</li></ul>'
			],
			// We take the first available P tag
			[
				'<ul><li>List item</li></ul><p>The lead paragraph is here.</p>',
				'<p>The lead paragraph is here.</p>'
			],
			// We do not take nested P tags as being the intro.
			[
				'<ul><li>List item</li></ul><div><p>The lead paragraph is not here.</p></div>',
				''
			],
			// Initial paragraphs from transclusions are skipped.
			[
				'<p about="#mwt1">Here is some unwanted transcluded content, perhaps an ' +
                  'artifact of a dewiki hatnote.</p><p>Here is the first content paragraph.</p>',
				'<p>Here is the first content paragraph.</p>'
			],
			// Initial paragraphs from transclusions are accepted if they contain <b> element.
			[
				'<p about="#mwt1">Here is a <b>good first paragraph</b> that happens to be' +
                  "transcluded.</p><p>Second paragraph, we don't want this!</p>",
				'<p about="#mwt1">Here is a <b>good first paragraph</b> that happens to be' +
                  'transcluded.</p>'
			],
			// If initial P has nested <style> and text is empty/not trimmed, omit element
			[
				'<p><style>.mw-parser-output { display: inherit }</style>   </p>',
				''
			],
			// If initial P has nested <style> and text, keep this node
			[
				'<p><style>.mw-parser-output { display: inherit }</style>First paragraph content </p>',
				'<p><style>.mw-parser-output { display: inherit }</style>First paragraph content </p>'
			],
			// If initial P has nested <style> and text along with <b> and <i> tags, keep this node
			[
				'<p><style>.mw-parser-output { display: inherit }</style><i>First</i> <b>paragraph</b> content </p>',
				'<p><style>.mw-parser-output { display: inherit }</style><i>First</i> <b>paragraph</b> content </p>'
			],
			// If initial P has only nested element with text, keep this node
			[
				'<p><b>Simply bold text</b></p>',
				'<p><b>Simply bold text</b></p>'
			],
			/*
				If initial P has <style>, empty next sibling and
				contains elements with the text, keep it
			*/
			[
				'<p><style>.mw-parser-output { display: inherit }</style><span>   </span>' +
				'<b><a href="/">Bold link</a></b>with text</p>',
				'<p><style>.mw-parser-output { display: inherit }</style><span>   </span>' +
				'<b><a href="/">Bold link</a></b>with text</p>'
			],
			// If initial P has <style> and empty sibling(s), skip it
			[
				'<p><style>.mw-parser-output { display: inherit }</style><span>   </span></p>',
				''
			],
			// If initial P has multiple nested <style> tags without text, skip it
			[
				'<p><style>.mw-parser-output { display: inherit }</style>   <span><style>.mw-parser' +
				' { display: inherit }</style><b></b></span></p>',
				''
			],
			// If initial P has multiple nested <style> tags and text, keep the node
			[
				'<p><style>.mw-parser-output { display: inherit }</style>   <span><style>.mw-parser' +
				' { display: inherit }</style><b>Foobar</b></span></p>',
				'<p><style>.mw-parser-output { display: inherit }</style>   <span><style>.mw-parser' +
				' { display: inherit }</style><b>Foobar</b></span></p>'
			],
			// Test more subsequent <style> tags and text
			[
				'<p><style>.mw-parser-output { display: inherit }</style>   <span><style>.mw-parser' +
				' { display: inherit }</style><b><style>.mw-parser-output { display: inherit }</style></b></span></p>',
				''
			],
			[
				'<p><style>.mw-parser-output { display: inherit }</style>   <span><style>.mw-parser' +
				' { display: inherit }</style><b><i>Foobar</i><style>.mw-parser-output { display: inherit }</style></b></span></p>',
				'<p><style>.mw-parser-output { display: inherit }</style>   <span><style>.mw-parser' +
				' { display: inherit }</style><b><i>Foobar</i><style>.mw-parser-output { display: inherit }</style></b></span></p>'
			],
			[
				'<p><b><style>.mw-parser-output { display: inherit }</style></b>345</p>',
				'<p><b><style>.mw-parser-output { display: inherit }</style></b>345</p>'
			]
		];

		testCases.forEach((test) => {
			const doc = domino.createDocument(test[0]);
			const lead = extractLeadIntroduction(doc);
			assert.equal(lead, test[1]);
		});
	});

	it('Trailing text content is escaped', () => {
		const html = '<p>foo</p>&lt;script&gt;alert(1);&lt;/script&gt;';
		const doc = domino.createDocument(html);
		const lead = extractLeadIntroduction(doc);
		assert.deepEqual(lead, html);
	});
});
