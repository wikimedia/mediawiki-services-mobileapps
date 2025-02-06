'use strict';

const preq = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');

describe('express app', function () {

	this.timeout(20000);
	let svc;
	beforeEach(async () => {
		svc = await server.start();
	});
	afterEach(async () => {
		await svc.stop();
	});
	it('should get robots.txt', (done) => {
		preq.get({
			uri: `${ server.config.uri }robots.txt`
		}).then((res) => {
			assert.deepEqual(res.status, 200);
			assert.deepEqual(res.body, 'User-agent: *\nDisallow: /\n');
			done();
		});
	});

	it('should set CORS headers', (done) => {
		if (server.config.service.conf.cors === false) {
			return true;
		}
		preq.get({
			uri: `${ server.config.uri }robots.txt`
		}).then((res) => {
			assert.deepEqual(res.status, 200);
			assert.deepEqual(res.headers['access-control-allow-origin'], '*');
			assert.deepEqual(!!res.headers['access-control-allow-headers'], true);
			assert.deepEqual(!!res.headers['access-control-expose-headers'], true);
			done();
		});
	});

	it('should set CSP headers', (done) => {
		if (server.config.service.conf.csp === false) {
			return true;
		}
		preq.get({
			uri: `${ server.config.uri }robots.txt`
		}).then((res) => {
			assert.deepEqual(res.status, 200);
			assert.deepEqual(res.headers['x-xss-protection'], '1; mode=block');
			assert.deepEqual(res.headers['x-content-type-options'], 'nosniff');
			assert.deepEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
			assert.deepEqual(res.headers['content-security-policy'], "default-src 'none'; frame-ancestors 'none'");
			assert.deepEqual(res.headers['x-content-security-policy'], "default-src 'none'; frame-ancestors 'none'");
			assert.deepEqual(res.headers['x-webkit-csp'], "default-src 'none'; frame-ancestors 'none'");
			done();
		});
	});

});
