'use strict';

const preq = require('preq');
const domino = require('domino');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');

const DOMAIN = 'en.wikipedia.org';
const TITLE = 'Cat';

describe('topics', function() {

	this.timeout(20000);

	let svc;
	before(async () => {
		svc = await server.start();
	});
	after(async () => await svc.stop());

	const localUri = (title, domain = DOMAIN) => `${ server.config.uri }${ domain }/v1/page/mobile-html/${ title }`;

	it('embeds predicted topics in the mobile-html output', () => preq.get({
		uri: localUri(TITLE),
		headers: { 'user-agent': 'WikipediaApp/PCS-unittest' }
	}).then((res) => {
		assert.deepEqual(res.status, 200);
		const doc = domino.createDocument(res.body);
		const meta = doc.head.querySelector('meta[property="pcs:topics"]');
		assert.ok(meta, 'expected a pcs:topics meta tag in the head');

		const topics = JSON.parse(meta.getAttribute('content'));
		assert.ok(Array.isArray(topics), 'topics content should be a JSON array');
		assert.ok(topics.length > 0, 'expected at least one predicted topic');
		topics.forEach((topic) => {
			assert.ok(typeof topic.topic === 'string' && topic.topic.length > 0,
				'each topic should have a non-empty topic string');
			assert.ok(typeof topic.score === 'number',
				'each topic should have a numeric score');
		});
	}));
});
