'use strict';

const nock = require('nock');
const assert = require('../utils/assert.js');
const topics = require('../../lib/topics');
const apiUtil = require('../../lib/api-util');

const logger = require('bunyan').createLogger({ name: 'test-logger', level: 'fatal' });
logger.log = () => {};

const INFERENCE_HOST = 'https://api.wikimedia.org';
const INFERENCE_PATH = '/service/lw/inference/v1/models/outlink-topic-model:predict';

// Builds a minimal mock request object with the templates set up the same
// way the real app does on startup. An optional template config overrides the
// default predicted_topics_req (e.g. to exercise the internal endpoint).
function mockReq(domain, predictedTopicsReq) {
	const app = { conf: {}, logger };
	if (predictedTopicsReq) {
		app.conf.predicted_topics_req = predictedTopicsReq;
	}
	apiUtil.setupApiTemplates(app);
	return {
		app,
		logger,
		headers: {},
		params: { domain }
	};
}

const PAGE_ID = 534366;
const REVISION_ID = 1358198637;

describe('lib:topics:getPredictedTopics', () => {
	afterEach(() => nock.cleanAll());

	it('returns the list of {topic, score} from the inference response', () => {
		const results = [
			{ topic: 'Geography.Regions.Americas.North_America', score: 0.7773 },
			{ topic: 'Culture.Biography.Biography*', score: 0.5545 }
		];
		nock(INFERENCE_HOST).post(INFERENCE_PATH, {
			page_id: PAGE_ID,
			revision_id: REVISION_ID,
			lang: 'en'
		}).reply(200, { prediction: { article: 'foo', results } });

		return topics.getPredictedTopics(mockReq('en.wikipedia.org'), PAGE_ID, REVISION_ID)
			.then((result) => {
				assert.deepEqual(result, results);
			});
	});

	it('queries the internal path-based endpoint when configured (GET)', () => {
		const results = [
			{ topic: 'Geography.Regions.Americas.North_America', score: 0.8903 }
		];
		const req = mockReq('en.wikipedia.org', {
			method: 'get',
			uri: 'https://linked-artifacts.discovery.wmnet:30443/revisions/v1/article_topics/{{wikiId}}/{{pageId}}/{{revisionId}}',
			headers: { 'content-type': 'application/json' }
		});
		nock('https://linked-artifacts.discovery.wmnet:30443')
			.get(`/revisions/v1/article_topics/enwiki/${ PAGE_ID }/${ REVISION_ID }`)
			.reply(200, { prediction: { article: 'foo', results } });

		return topics.getPredictedTopics(req, PAGE_ID, REVISION_ID)
			.then((result) => {
				assert.deepEqual(result, results);
			});
	});

	it('resolves undefined (does not reject) on an upstream error', () => {
		nock(INFERENCE_HOST).post(INFERENCE_PATH).reply(500, 'boom');
		return topics.getPredictedTopics(mockReq('en.wikipedia.org'), PAGE_ID, REVISION_ID)
			.then((result) => {
				assert.deepEqual(result, undefined);
			});
	});

	it('resolves undefined when the response has no results array', () => {
		nock(INFERENCE_HOST).post(INFERENCE_PATH).reply(200, { prediction: {} });
		return topics.getPredictedTopics(mockReq('en.wikipedia.org'), PAGE_ID, REVISION_ID)
			.then((result) => {
				assert.deepEqual(result, undefined);
			});
	});

	it('resolves undefined without a request when the language cannot be determined', () => {
		// www.wikidata.org has no resolvable language code
		topics.getPredictedTopics(mockReq('www.wikidata.org'), PAGE_ID, REVISION_ID)
			.then((result) => {
				assert.deepEqual(result, undefined);
			});
	});

	it('resolves undefined without a request when an id is missing', () => {
		topics.getPredictedTopics(mockReq('en.wikipedia.org'), PAGE_ID, undefined)
			.then((result) => {
				assert.deepEqual(result, undefined);
			});
	});
});
