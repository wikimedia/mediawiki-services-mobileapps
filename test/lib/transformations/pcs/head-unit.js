'use strict';

const domino = require('domino');
const assert = require('../../../utils/assert.js');
const head = require('../../../../lib/transformations/pcs/head');

describe('lib:head:addPredictedTopics', () => {
	const getTopicsMeta = (document) =>
		document.head.querySelector('meta[property="pcs:topics"]');

	it('adds a meta tag with the topics serialized as JSON', () => {
		const document = domino.createDocument('<html><head></head><body></body></html>');
		const topics = [
			{ topic: 'Geography.Regions.Americas.North_America', score: 0.7773 },
			{ topic: 'Culture.Biography.Biography*', score: 0.5545 }
		];

		head.addPredictedTopics(document, topics);

		const meta = getTopicsMeta(document);
		assert.ok(meta);
		assert.deepEqual(JSON.parse(meta.getAttribute('content')), topics);
	});

	it('does not add a meta tag when topics is undefined', () => {
		const document = domino.createDocument('<html><head></head><body></body></html>');
		head.addPredictedTopics(document, undefined);
		assert.ok(!getTopicsMeta(document));
	});

	it('adds a meta tag with an empty array when there are no topics', () => {
		const document = domino.createDocument('<html><head></head><body></body></html>');
		head.addPredictedTopics(document, []);
		const meta = getTopicsMeta(document);
		assert.ok(meta);
		assert.deepEqual(JSON.parse(meta.getAttribute('content')), []);
	});

	it('does not throw when topics is not an array', () => {
		const document = domino.createDocument('<html><head></head><body></body></html>');
		try {
			head.addPredictedTopics(document, { not: 'an array' });
			assert.ok(!getTopicsMeta(document));
		} catch (e) {
			assert.fail(e);
		}
	});
});
