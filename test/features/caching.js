'use strict';

const preq = require('preq');
const assert = require('../utils/assert.js');
const server = require('../utils/server');
const sinon = require('sinon');
const cassandra = require('@wikimedia/cassandra-storage');
const { initCache } = require('../../lib/caching.js');
const { isObject } = require('underscore');

const localUri = (endpoint, title, domain = 'en.wikipedia.org') => {
	return `${ server.config.uri }${ domain }/v1/page/${ endpoint }/${ title }`;
};

describe('Cache config', function () {
	it('should parse config and adapt ca value', function () {
		const mockApp = {
			conf: {
				cassandra: {
					hosts: ['127.0.0.1'],
					port: 9042,
					local_dc: 'datacenter1',
					authentication: {
						username: 'cassandra',
						password: 'cassandra',
					},
					tls: {
						ca: '/path/to/file'
					}
				},
				caching: {
					enabled: true,
					ttl: 0,
					cassandra: {
						keyspace: 'tests',
						storageTable: 'storage',
					},
				},
			},
		};
		const engineStubbedInstance = sinon.createStubInstance(cassandra.Engine);
		sinon.stub(cassandra, 'Engine').returns(engineStubbedInstance);
		sinon.stub(cassandra, 'middlewareFactory');
		initCache(mockApp);
		assert.ok(cassandra.Engine.called);
		const initArgs = cassandra.Engine.getCall(0).args[0];
		assert.deepEqual(initArgs.tls.ca, ['/path/to/file']);
		sinon.restore();
	});
});

describe('Cached endpoints', function () {
	this.timeout(20000);

	for (const endpoint of ['summary', 'mobile-html']) {
		it(`should call cache get for cached ${ endpoint } output`, async () => {
			const uri = localUri(endpoint, 'Cat');
			const expectedBody = `Mocked ${ endpoint } for cat page`;
			const engineStubbedInstance = sinon.createStubInstance(cassandra.Engine, {
				get: sinon.stub().returns(
					Promise.resolve({
						headers: {},
						value: Buffer.from(expectedBody),
						cached: new Date(),
					})
				),
			});

			sinon.stub(cassandra, 'Engine').returns(engineStubbedInstance);
			const svc = await server.start({ caching: { enabled: true } });
			return preq.get({ uri }).then((res) => {
				assert.equal(res.body, expectedBody);
				sinon.restore();
				svc.stop();
			});
		});

		it(`should call cache set for non-cached ${ endpoint } page`, async () => {
			const uri = localUri(endpoint, 'Cat');
			const setStub = sinon.stub();
			const engineStubbedInstance = sinon.createStubInstance(cassandra.Engine, {
				get: sinon.stub().returns(Promise.resolve(null)),
				set: setStub,
			});

			sinon.stub(cassandra, 'Engine').returns(engineStubbedInstance);
			const svc = await server.start({ caching: { enabled: true, ttl: 0 } });

			return preq.get({ uri }).then((res) => {
				sinon.assert.calledOnce(setStub);
				const callArgs = setStub.getCall(0).args;
				const expectedBody = isObject(res.body)
					? JSON.stringify(res.body)
					: res.body;
				assert.equal(callArgs[0], `/en.wikipedia.org/v1/page/${ endpoint }/Cat`);
				assert.equal(callArgs[1], 'en.wikipedia.org');
				assert.equal(
					Object.keys(callArgs[2]).every(
						(val) => Object.keys(res.headers).includes(val)
					),
					true
				);
				assert.equal(callArgs[3].equals(Buffer.from(expectedBody)), true);
				assert.equal(callArgs[4], 0);
				sinon.restore();
				svc.stop();
			});
		});
	}
});
