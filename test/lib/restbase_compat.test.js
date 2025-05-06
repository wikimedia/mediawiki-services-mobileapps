'use strict';

const assert = require('assert');
const restbaseCompat = require('../../lib/restbase-compat');
const { mockReq, mockRes } = require('sinon-express-mock');
const { isRequestCachable } = require('../../lib/restbase-compat');

describe('should exclude traffic', () => {
	it('should return true for allowed user-agent', () => {
		const res = mockRes();
		const req = mockReq({
			params: {
				domain: 'test.wikipedia.org'
			},
			headers: {
				'user-agent': 'allowed-ua'
			}
		});
		req.get.withArgs('user-agent').returns(req.headers['user-agent']);
		req.app = {
			conf: {
				excludedUserAgents: ['excluded-ua']
			}
		};
		assert.ok(restbaseCompat.isRequestCachable(req, res));
	});

	it('should return false for not allowed user-agent', () => {
		const res = mockRes();
		const req = mockReq({
			params: {
				domain: 'test.wikipedia.org'
			},
			headers: {
				'user-agent': 'excluded-ua'
			}
		});
		req.get.withArgs('user-agent').returns(req.headers['user-agent']);
		req.app = {
			conf: {
				excludedUserAgents: ['excluded-ua']
			}
		};
		assert.ok(!restbaseCompat.isRequestCachable(req, res));
	});

	it('should return 403 for excluded domains with excluded UA', () => {
		const res = mockRes();
		const req = mockReq({
			params: {
				domain: 'en.wikipedia.org'
			},
			headers: {
				'user-agent': 'excluded-ua'
			}
		});
		req.get.withArgs('user-agent').returns(req.headers['user-agent']);
		req.app = {
			conf: {
				excludedUserAgents: ['excluded-ua'],
				excludedDomainsPattern: '(en|de)\\.wikipedia\\.org'
			}
		};
		isRequestCachable(req, res);
		assert.ok(res.send.withArgs(403, 'RESTBase sunset: Domain not allowed').calledOnce);
	});

	it('should not call send for excluded domain with allowed UA', () => {
		const res = mockRes();
		const req = mockReq({
			params: {
				domain: 'en.wikipedia.org'
			},
			headers: {
				'user-agent': 'allowed-ua'
			}
		});
		req.get.withArgs('user-agent').returns(req.headers['user-agent']);
		req.app = {
			conf: {
				excludedUserAgents: ['excluded-ua'],
				excludedDomainsPattern: '(en|de)\\.wikipedia\\.org'
			}
		};
		isRequestCachable(req, res);
		assert.ok(res.send.notCalled);
	});

	it('should not call send for allowed domains', () => {
		const res = mockRes();
		const req = mockReq({
			params: {
				domain: 'test.wikipedia.org'
			},
			headers: {
				'user-agent': 'allowed-ua'
			}
		});
		req.get.withArgs('user-agent').returns(req.headers['user-agent']);
		req.app = {
			conf: {
				excludedUserAgents: ['excluded-ua'],
				excludedDomainsPattern: '(en|de)\\.wikipedia\\.org'
			}
		};
		isRequestCachable(req, res);
		assert.ok(res.send.notCalled);
	});

	it('should not call send with default config', () => {
		const res = mockRes();
		const req = mockReq({
			params: {
				domain: 'test.wikipedia.org'
			},
			headers: {
				'user-agent': 'allowed-ua'
			}
		});
		req.get.withArgs('user-agent').returns(req.headers['user-agent']);
		req.app = {
			conf: {
				excludedUserAgents: ['excluded-ua'],
			}
		};
		isRequestCachable(req, res);
		assert.ok(res.send.notCalled);
	});

});
