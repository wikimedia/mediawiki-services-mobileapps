'use strict';

const assert = require('../../utils/assert');
const sinon = require('sinon');
const server = require('../../utils/server');
const { HTTPTitleRedirectError, httpTitleRedirectErrorMiddleware } = require('../../../lib/core-api-compat');
const preq = require('preq');

describe('lib:core-api-compat unit tests', () => {

	it('should create a HTTPTitleRedirectError', function () {
		const error = new HTTPTitleRedirectError('test');
		assert.equal(error.title, 'test');
		assert.equal(error.name, 'HTTPTitleRedirectError');
		assert.equal(error.message, 'HTTP response redirects to location: test');
	});

	it('redirect middleware should redirect if configured', function () {
		const error = new HTTPTitleRedirectError('test');
		const res = {
			redirect: sinon.stub()
		};
		const req = {
			getTitleRedirectLocation: (title) => `/test/path/${title}`
		};
		const next = sinon.stub();

		const result = httpTitleRedirectErrorMiddleware(error, req, res, next);
		assert.ok(res.redirect.calledOnce);
		assert.equal(res.redirect.args, '/test/path/test');
	});

	it('redirect middleware should not redirect if error not matching', function () {
		const error = new Error('not redirect');
		const res = {
			redirect: sinon.stub()
		};
		const req = {
			getTitleRedirectLocation: (title) => `/test/path/${title}`
		};
		const next = sinon.stub();

		assert.throws(() => {
			const result = httpTitleRedirectErrorMiddleware(error, req, res, next);
			assert.ok(res.redirect.notCalled);
			assert.ok(next.calledOnce);
			assert.equal(next.args, error);
		}, Error);
	});

	it('redirect middleware should not redirect if not reverse url defined', function () {
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

describe('PCS configured to redirect', function () {
	const buildUri = (path) => {
		return `${server.config.uri}${path}`;
	};

	before(() => {
		const options = {
			pcs_handles_redirects: true,
			use_coreparsoid_endpoint: true
		};
		server.start(options);
	});

	after(() => server.stop());

	it('mobile-html should redirect to the resolved page', async function () {
		const title = 'TestPCSRedirect';
		const path = `test.wikipedia.org/v1/page/mobile-html/${title}`;
		const res = await preq.get({ uri: buildUri(path), followRedirect: false });
		assert.equal(res.status, 302);
		assert.equal(res.headers.location, 'TestPCSRedirectDestination');
	});

	it('mobile-html-offline-resources should not redirect to the resolved page', async function () {
		const title = 'TestPCSRedirect';
		const path = `test.wikipedia.org/v1/page/mobile-html-offline-resources/${title}`;
		const res = await preq.get({ uri: buildUri(path), followRedirect: false });
		assert.equal(res.status, 200);
	});
});

describe('PCS configured to not redirect', function () {
	const buildUri = (path) => {
		return `${server.config.uri}${path}`;
	};

	before(() => {
		const options = {
			use_coreparsoid_endpoint: true
		};
		server.start(options);
	});

	after(() => server.stop());

	it('mobile-html should not redirect and should parse the resolved response', async function () {
		const title = 'TestPCSRedirect';
		const path = `test.wikipedia.org/v1/page/mobile-html/${title}`;
		const res = await preq.get({ uri: buildUri(path), followRedirect: false });
		assert.equal(res.status, 200);
	});
});
