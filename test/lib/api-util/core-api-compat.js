'use strict';

const assert = require('../../utils/assert');
const express = require('express');
const sinon = require('sinon');
const server = require('../../utils/server');
const testUtil = require('../../utils/testUtil');
const { HTTPTitleRedirectError, httpTitleRedirectErrorMiddleware, followRequest } = require('../../../lib/core-api-compat');
const preq = require('preq');
const { Template } = require('swagger-router');
const { HTTPError } = require('../../../lib/util');

describe('lib:core-api-compat unit tests', () => {

	it('should create a HTTPTitleRedirectError', () => {
		const error = new HTTPTitleRedirectError({ key: 'val' }, 'test');
		assert.equal(error.title, 'test');
		assert.deepEqual(error.params, { key: 'val' });
		assert.equal(error.name, 'HTTPTitleRedirectError');
		assert.equal(error.message, 'HTTP response redirects to location: test');
	});

	it('redirect middleware should redirect if configured', () => {
		const error = new HTTPTitleRedirectError({ domain: 'en.wikipedia.org' }, 'test');
		const res = {
			redirect: sinon.stub()
		};
		const req = {
			app: {
				conf: {}
			},
			getTitleRedirectLocation: (domain, title) => `${ domain }/test/path/${ title }`
		};
		const next = sinon.stub();

		const result = httpTitleRedirectErrorMiddleware(error, req, res, next);
		assert.ok(res.redirect.calledOnce);
		assert.equal(res.redirect.args, 'en.wikipedia.org/test/path/test');
	});

	it('redirect middleware should not redirect if error not matching', () => {
		const error = new Error('not redirect');
		const res = {
			redirect: sinon.stub()
		};
		const req = {
			getTitleRedirectLocation: (title) => `/test/path/${ title }`
		};
		const next = sinon.stub();

		assert.throws(() => {
			const result = httpTitleRedirectErrorMiddleware(error, req, res, next);
			assert.ok(res.redirect.notCalled);
			assert.ok(next.calledOnce);
			assert.equal(next.args, error);
		}, Error);
	});

	it('redirect middleware should not redirect if not reverse url defined', () => {
		const error = new HTTPTitleRedirectError('test');
		const res = {
			redirect: sinon.stub()
		};
		const req = {};
		const next = sinon.stub();

		assert.throws(() => {
			const result = httpTitleRedirectErrorMiddleware(error, req, res, next);
			assert.ok(res.redirect.notCalled);
			assert.ok(next.calledOnce);
			assert.equal(next.args, error);
		}, Error);
	});

});

describe('PCS configured to redirect', function() {
	const buildUri = (path) => `${ server.config.uri }${ path }`;
	this.timeout(20000);

	let svc;
	before(async () => {
		const options = {
			pcs_handles_redirects: true,
			use_coreparsoid_endpoint: true
		};
		svc = await server.start(options);
	});

	after(async () => await svc.stop());

	it('mobile-html should redirect to the resolved page', async () => {
		const title = 'TestPCSRedirect';
		const path = `test.wikipedia.org/v1/page/mobile-html/${ title }`;
		const res = await preq.get({ uri: buildUri(path), followRedirect: false });
		assert.equal(res.status, 302);
		assert.equal(res.headers.location, '/test.wikipedia.org/v1/page/mobile-html/TestPCSRedirectDestination');
	});

	it('mobile-html should redirect to the resolved page when using action=parse', async () => {
		const title = 'User%3AJGiannelos_%28WMF%29%2Ftest_redirect';
		const path = `zh.wikipedia.org/v1/page/mobile-html/${ title }`;
		const res = await preq.get({ uri: buildUri(path), followRedirect: false });
		assert.equal(res.status, 302);
		assert.equal(res.headers.location, '/zh.wikipedia.org/v1/page/mobile-html/%E7%8A%AC');
	});

	it('mobile-html-offline-resources should not redirect to the resolved page', async () => {
		const title = 'TestPCSRedirect';
		const path = `test.wikipedia.org/v1/page/mobile-html-offline-resources/${ title }`;
		const res = await preq.get({ uri: buildUri(path), followRedirect: false });
		assert.equal(res.status, 200);
	});
});

describe('PCS configured to redirect with absolute URLs', function() {
	const buildUri = (path) => `${ server.config.uri }${ path }`;
	this.timeout(20000);

	let svc;
	before(async () => {
		const options = {
			pcs_handles_redirects: true,
			use_coreparsoid_endpoint: true,
			pcs_returns_absolute_redirects: true
		};
		svc = await server.start(options);
	});

	after(async () => await svc.stop());

	it('mobile-html should redirect to the resolved page', async () => {
		const title = 'TestPCSRedirect';
		const path = `test.wikipedia.org/v1/page/mobile-html/${ title }`;
		const res = await preq.get({ uri: buildUri(path), followRedirect: false });
		assert.equal(res.status, 302);
		assert.equal(res.headers.location, '//test.wikipedia.org/api/rest_v1/page/mobile-html/TestPCSRedirectDestination');
	});
});

describe('PCS configured to not redirect', function() {
	const buildUri = (path) => `${ server.config.uri }${ path }`;
	this.timeout(20000);

	let svc;
	before(async () => {
		const options = {
			use_coreparsoid_endpoint: true
		};
		svc = await server.start(options);
	});

	after(async () => await svc.stop());

	it('mobile-html should not redirect and should parse the resolved response', async () => {
		const title = 'TestPCSRedirect';
		const path = `test.wikipedia.org/v1/page/mobile-html/${ title }`;
		const res = await preq.get({ uri: buildUri(path), followRedirect: false });
		assert.equal(res.status, 200);
	});

	it('should fixup missing content-language header', async () => {
		const title = 'Erde';
		const path = `de.wikipedia.org/v1/page/mobile-html/${ title }`;
		const res = await preq.get({ uri: buildUri(path) });
		assert.equal(res.status, 200);
		assert.equal(res.headers['content-language'], 'de');
	});
});

describe('Following redirects should stop after max redirects', async () => {
	let testServer, redirectCount;

	const app = express();
	app.get('/v1/page/Foo/with_html', (req, res) => {
		res.redirect('/v1/page/Foo/with_html');
		redirectCount += 1;
	});

	app.get('/v1/page/Bar/with_html', (req, res) => {
		if ( redirectCount === 5 ) {
			res.json({ title: 'bar' } );
		} else {
			res.redirect('/v1/page/Bar/with_html');
			redirectCount += 1;
		}
	});

	beforeEach( async () => {
		const port = 8888;
		redirectCount = 0;
		testServer = app.listen(port, () => {});
	});

	afterEach( () => {
		testServer.close();
	});

	it('should raise a max redirects error', async () => {
		const incomingRequest = testUtil.getMockedServiceReq();
		incomingRequest.app.conf.maxRedirects = 10;
		incomingRequest.app.conf.corepagehtml_req = {
			method: 'GET',
			uri: 'http://localhost:8888/v1/page/{{title}}/with_html',
		};
		incomingRequest.app.corepagehtml_tpl = new Template(
			incomingRequest.app.conf.corepagehtml_req
		);
		try {
			await followRequest(incomingRequest, { params: { title: 'Foo' } });
		} catch (err) {
			assert.ok( err instanceof HTTPError );
			assert.ok( err.title === 'Max redirects exceeded' );
			assert.ok( redirectCount === incomingRequest.app.conf.maxRedirects + 1 );
		}
	});

	it('should follow 5 redirects', async () => {
		const incomingRequest = testUtil.getMockedServiceReq();
		incomingRequest.app.conf.maxRedirects = 10;
		incomingRequest.app.conf.corepagehtml_req = {
			method: 'GET',
			uri: 'http://localhost:8888/v1/page/{{title}}/with_html',
		};
		incomingRequest.app.corepagehtml_tpl = new Template(
			incomingRequest.app.conf.corepagehtml_req
		);
		const res = await followRequest(incomingRequest, { params: { title: 'Bar' } });
		assert.ok( res.status === 200 );
		assert.ok( redirectCount === 5);
	});

});
