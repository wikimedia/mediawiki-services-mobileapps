'use strict';
const sinon = require('sinon');
const { projectAllowMiddlewares } = require('../../lib/wmf-projects');

describe('Default wmf projects middleware', () => {
	it('should allow an allowed domain', () => {
		const req = {
			params: {
				domain: 'en.wikipedia.org'
			},
			app: {
				conf: {
					restrict_domains: true
				}
			}
		};

		const res = {
			status: sinon.stub().returnsThis(),
			send: sinon.stub().returnsThis()
		};

		const next = sinon.stub();

		projectAllowMiddlewares['mobile-html'](req, res, next);
		sinon.assert.calledOnce(next);
		sinon.assert.notCalled(res.status);
		sinon.assert.notCalled(res.send);
	});

	it('should return 404 for a disallowed domain', () => {
		const req = {
			params: {
				domain: 'foo.org'
			},
			app: {
				conf: {
					restrict_domains: true
				}
			}
		};

		const res = {
			status: sinon.stub().returnsThis(),
			send: sinon.stub().returnsThis()
		};

		const next = sinon.stub();

		projectAllowMiddlewares['mobile-html'](req, res, next);
		sinon.assert.notCalled(next);
		sinon.assert.calledOnce(res.status);
		sinon.assert.calledWith(res.status, 404);
		sinon.assert.calledOnce(res.send);
		sinon.assert.calledWith(res.send, 'Domain not allowed');
	});
});

describe('Summary wmf projects middleware', () => {
	it('should allow an allowed domain', () => {
		const req = {
			params: {
				domain: 'en.wikipedia.org'
			},
			app: {
				conf: {
					restrict_domains: true
				}
			}
		};

		const res = {
			status: sinon.stub().returnsThis(),
			send: sinon.stub().returnsThis()
		};

		const next = sinon.stub();

		projectAllowMiddlewares['page-summary'](req, res, next);
		sinon.assert.calledOnce(next);
		sinon.assert.notCalled(res.status);
		sinon.assert.notCalled(res.send);
	});

	it('should return 404 for a disallowed domain', () => {
		const req = {
			params: {
				domain: 'foo.org'
			},
			app: {
				conf: {
					restrict_domains: true
				}
			}
		};

		const res = {
			status: sinon.stub().returnsThis(),
			send: sinon.stub().returnsThis()
		};

		const next = sinon.stub();

		projectAllowMiddlewares['page-summary'](req, res, next);
		sinon.assert.notCalled(next);
		sinon.assert.calledOnce(res.status);
		sinon.assert.calledWith(res.status, 404);
		sinon.assert.calledOnce(res.send);
		sinon.assert.calledWith(res.send, 'Domain not allowed');
	});
});
