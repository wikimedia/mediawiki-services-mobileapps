'use strict';

const domino = require('domino');
const preq   = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');

describe('mobile-html', function() {

	this.timeout(20000);

	let svc;
	before(async () => {
		svc = await server.start();
	});
	after(async () => await svc.stop());

	const localUri = (title, domain = 'en.wikipedia.org') => `${ server.config.uri }${ domain }/v1/page/mobile-html/${ title }`;

	it('HTML should be sectioned', () => {
		const uri = localUri('Foobar/788941783');
		return preq.get({ uri })
			.then((res) => {
				const document = domino.createDocument(res.body);
				assert.selectorExistsNTimes(document, 'section', 7, 'should have 7 sections');
			});
	});

	it('mobile-html headers not compatible with restbase output', () => {
		const uri = localUri('Foobar/788941783');
		const defaultHeaders = [
			'access-control-allow-origin',
			'access-control-allow-headers',
			'access-control-expose-headers',
			'x-xss-protection',
			'x-content-type-options',
			'x-frame-options',
			'content-security-policy',
			'x-content-security-policy',
			'content-type',
			'content-language',
			'etag',
			'vary',
			'date',
			'connection',
			'keep-alive',
			'transfer-encoding',
			'x-webkit-csp',
			'cache-control'
		];

		return preq.get({ uri })
			.then((res) => {
				assert.deepEqual(defaultHeaders.length, Object.keys(res.headers).length);
				defaultHeaders.forEach((header) => {
					assert.deepEqual(!!res.headers[header], true, `Header ${ header } not present`);
				});
			});
	});

	it('mobile-html headers compatible with restbase output', () => {
		const uri = localUri('Foobar/788941783');
		const restbaseHeaders = [
			'access-control-allow-origin',
			'access-control-allow-methods',
			'access-control-allow-headers',
			'access-control-expose-headers',
			'x-xss-protection',
			'x-content-type-options',
			'x-frame-options',
			'referrer-policy',
			'content-security-policy',
			'x-content-security-policy',
			'content-type',
			'content-language',
			'etag',
			'vary',
			'date',
			'connection',
			'keep-alive',
			'transfer-encoding',
			'x-webkit-csp',
			'cache-control'
		];

		return preq.get({ uri, headers: { 'X-RESTBase-Compat': true } })
			.then((res) => {
				assert.deepEqual(restbaseHeaders.length, Object.keys(res.headers).length);
				restbaseHeaders.forEach((header) => {
					assert.deepEqual(!!res.headers[header], true, `Header ${ header } not present`);
				});
			});
	});

	it('mobile-html should have css links + viewport set', () => {
		const uri = localUri('Foobar/788941783');
		return preq.get({ uri })
			.then((res) => {
				const document = domino.createDocument(res.body);
				assert.selectorExistsNTimes(document, 'html > head > link[rel=stylesheet]', 3,
					'should have 3 css files');
				assert.selectorExistsNTimes(document, 'html > head > meta[name=viewport]', 1,
					'should have 1 meta element setting viewport');
			});
	});

	it('mobile-html should have lead paragraph moved up', () => {
		const uri = localUri('Dog/844680047');
		return preq.get({ uri })
			.then((res) => {
				const document = domino.createDocument(res.body);
				const section0 = document.querySelector('section[data-mw-section-id=0]');
				// children[0] edit button
				// children[1] 1st hatnote
				// children[2] 2nd hatnote
				// children[3] 3nd hatnote
				assert.ok(section0.children[4].outerHTML.startsWith('<p>The <b>domestic dog</b>'));
			});
	});

	it('mobile-html should not have navboxes', () => {
		const uri = localUri('Cat');
		return preq.get({ uri })
			.then((res) => {
				const document = domino.createDocument(res.body);
				assert.selectorDoesNotExist(document, 'div.navbox', 'Document contains navboxes');
			});
	});

	it('mobile-html should have meta tags indicating page protection', () => {
		const uri = localUri('Protected_page', 'test.wikipedia.org');
		return preq.get(uri).then((res) => {
			const document = domino.createDocument(res.body);
			const edit = document.querySelector('meta[property=mw:pageProtection:edit]');
			assert.deepEqual(edit.getAttribute('content'), 'sysop');
			const move = document.querySelector('meta[property=mw:pageProtection:move]');
			assert.deepEqual(move.getAttribute('content'), 'sysop');
		});
	});

	it('mobile-html from parse should have meta tags indicating page protection', () => {
		const uri = localUri('%E9%97%87%E5%BD%B1%E4%B9%8B%E5%BF%83/54664518', 'zh.wikipedia.org');
		return preq.get(uri).then((res) => {
			const document = domino.createDocument(res.body);
			const meta = document.querySelector('meta[property=mw:pageProtection:edit]');
			assert.deepEqual(meta.getAttribute('content'), 'autoconfirmed');
		});
	});

	it('mobile-html should not enable edit talk page button by default', () => {
		const uri = localUri('Cat');
		return preq.get({ uri })
			.then((res) => {
				const document = domino.createDocument(res.body);
				assert.selectorDoesNotExist(document, '.pcs-title-icon-talk-page', 'Document contains talk page button by default');
			});
	});

});
