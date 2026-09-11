'use strict';

const preq = require('preq');
const domino = require('domino');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');

const DOMAIN = 'en.wikipedia.org';
const TITLE = 'Cat';
const TITLE_WITH_MATH = 'Gravity';

describe('mathjax', function() {

	this.timeout(20000);

	let svc;
	before(async () => {
		svc = await server.start();
	});
	after(async () => await svc.stop());

	const localUri = (title, domain = DOMAIN) => `${ server.config.uri }${ domain }/v1/page/mobile-html/${ title }`;

	it('page without mathmode parameter does not include mathjax', () => preq.get({
		uri: localUri(TITLE_WITH_MATH),
		headers: { 'user-agent': 'WikipediaApp/PCS-unittest' }
	}).then((res) => {
		assert.deepEqual(res.status, 200);
		const doc = domino.createDocument(res.body);
		const meta = doc.head.querySelector('meta[property="mw:generalModules"]' );
		const modules = meta ? meta.getAttribute('content').split('|') : [];
		assert.notContains( modules, 'ext.math.mathjax' );
		const script = doc.head.querySelector( '#MathJax-script' );
		assert.equal( script, null );
	}));

	it('page with mathmode but no math content does not include mathjax', () => preq.get({
		uri: localUri(TITLE).concat('?mathmode=mathjax'),
		headers: { 'user-agent': 'WikipediaApp/PCS-unittest' }
	}).then((res) => {
		assert.deepEqual(res.status, 200);
		const doc = domino.createDocument(res.body);
		const meta = doc.head.querySelector('meta[property="mw:generalModules"]' );
		const modules = meta ? meta.getAttribute('content').split('|') : [];
		assert.notContains( modules, 'ext.math.mathjax' );
		const script = doc.head.querySelector( '#MathJax-script' );
		assert.equal( script, null );
	}));

	it('page with mathmode and math content should include mathjax', () => preq.get({
		uri: localUri(TITLE_WITH_MATH).concat('?mathmode=mathjax'),
		headers: { 'user-agent': 'WikipediaApp/PCS-unittest' }
	}).then((res) => {
		assert.deepEqual(res.status, 200);
		const doc = domino.createDocument(res.body);
		const meta = doc.head.querySelector('meta[property="mw:generalModules"]' );
		const modules = meta ? meta.getAttribute('content').split('|') : [];
		assert.contains( modules, 'ext.math.mathjax' );
		assert.selectorExistsOnce( doc.head, '#MathJax-script' );
	}));
});
