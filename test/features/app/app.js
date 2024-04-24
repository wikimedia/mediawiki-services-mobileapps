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
	afterEach(async function () {
		await svc.stop();
	});
	it('should get robots.txt', function (done) {
		preq.get({
			uri: `${ server.config.uri }robots.txt`
		}).then((res) => {
			assert.deepEqual(res.status, 200);
			assert.deepEqual(res.body, 'User-agent: *\nDisallow: /\n');
			done();
		});
	});

	it('should set CORS headers', function (done) {
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

	it('should set CSP headers', function (done) {
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

	it('should not follow redirects', function (done) {
		// The following page has a redirect but we don't want MCS to follow it
		// since RESTBase already takes care of redirects.
		const title = 'User:BSitzmann_%28WMF%29%2FMCS%2FTest%2Fredirect_test2',
			normalizedTitle = 'User:BSitzmann (WMF)/MCS/Test/redirect test2',
			displayTitle = '<span class="mw-page-title-namespace">User</span>' +
				'<span class="mw-page-title-separator">:</span><span class="mw-page-title-main">' +
				'BSitzmann (WMF)/MCS/Test/redirect test2</span>';
		preq.get(`${ server.config.uri }test.wikipedia.org/v1/page/mobile-sections/${ title }`)
			.then((res) => {
				assert.equal(res.status, 200);
				assert.equal(res.body.lead.normalizedtitle, normalizedTitle);
				assert.equal(res.body.lead.displaytitle, displayTitle);
				assert.ok(res.body.lead.redirect === true);
				done();
			});
	});

});
