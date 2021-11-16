'use strict';

const assert = require('../../utils/assert');
const createDocument = require('domino').createDocument;
const path = require('path');
const fs = require('fs');

const parseDefinitions = require('../../../lib/definitions/parseDefinitions');

function parse(name) {
	const data = fs.readFileSync(path.resolve(__dirname, `../../fixtures/wiktionary/${name}.htm`),
		'utf8');
	return parseDefinitions(createDocument(data), 'en.wiktionary.org', name);
}

function toText(html) {
	return createDocument(html).body.textContent;
}

describe('lib:definitions', () => {
	const avere  = parse('avere');
	const kuulua = parse('kuulua');

	describe('Level 2 headers', () => {
		it('extracts them to language code keys', () => {
			assert.deepEqual(Object.keys(avere), ['ast', 'it', 'la', 'ro', 'roa-tara']);
		});
	});

	describe('parts of speech', () => {
		it('is set', () => {
			assert.deepEqual(avere.it.map(e => e.partOfSpeech), ['Verb', 'Noun']);
		});
	});

	describe('language', () => {
		it('is set on each entry', () => {
			avere.it.forEach(e => assert.deepEqual(e.language, 'Italian'));
		});
	});

	describe('definitions', () => {
		const definitions = kuulua.fi[0].definitions;
		assert.deepEqual(definitions.map(d => toText(d.definition)), [
			'to be heard/audible',
			'to be said',
			"Used to refer to the state of one's life.",
			'( ~ + allative) to belong (showing ownership or location)',
			'( ~ + illative) to belong (to be member of)',
			"( ~ + allative) to concern, to be someone's business"
		]);
	});

	describe('examples', () => {

		describe('parsed', () => {
			describe('formatted with MediaWiki markup (#:/#::)', () => {
				it('extracts usage examples', () => {
					const examples = kuulua.fi[0].definitions[5].parsedExamples;
					assert.deepEqual(examples, [
						{
							example: '<i>Miten tämä sinulle <b>kuuluu</b>?</i>',
							translation: 'How does this <b>concern</b> you?'
						},
						{
							example: '<i>Hän kysyi, mistä puhuin Samin kanssa. Sanoin, että se ' +
                                     '<b>ei kuulu hänelle</b>.</i>',
							translation: 'He asked what I was talking to Sam about. I told him ' +
                                         'it <b>was none of his business</b>.'
						}
					]);
				});
			});

			describe('formatted with microformats', () => {
				it('extracts usage examples', () => {
					const examples = avere.it.find(e => e.partOfSpeech === 'Verb')
						.definitions[0].parsedExamples;

					assert.deepEqual(examples, [
						{
							example: "<b>Avevo</b> un'anima.",
							translation: '<b>I used to have</b> a soul.'
						},
						{
							example: '<b>Ho</b> una macchina.',
							translation: '<b>I have</b> a car.'
						},
						{
							example: '<b>Ho</b> diciassette anni.',
							translation: '<b>I am</b> 17 years old.',
							literally: '<b>I have</b> 17 years.'
						}
					]);
				});
			});
		});

		describe('unparsed/old format', () => {
			describe('formatted with MediaWiki markup (#:/#::)', () => {
				it('extracts usage examples', () => {
					const examples = kuulua.fi[0].definitions[5].examples;
					assert.deepEqual(examples, [
						'<i>Miten tämä sinulle <b>kuuluu</b>?</i>',
						'<i>Hän kysyi, mistä puhuin Samin kanssa. Sanoin, että se ' +
                        '<b>ei kuulu hänelle</b>.</i>'
					]);
				});
			});

			describe('formatted with microformats', () => {
				it('extracts usage examples', () => {
					const examples = avere.it.find(e => e.partOfSpeech === 'Verb')
						.definitions[0].examples;

					assert.deepEqual(examples, [
						"<b>Avevo</b> un'anima.",
						'<b>Ho</b> una macchina.',
						'<b>Ho</b> diciassette anni.'
					]);
				});
			});
		});
	});
});
