'use strict';

const preq = require('preq');
const assert = require('../utils/assert.js');
const server = require('../utils/server');
const sinon = require('sinon');
const cassandra = require('@wikimedia/cassandra-storage');
const { isObject } = require('underscore');

const localUri = (endpoint, title, domain = 'en.wikipedia.org') => {
	return `${server.config.uri}${domain}/v1/page/${endpoint}/${title}`;
};

describe('Cached endpoints', function () {
	this.timeout(20000);

	for (const endpoint of ['summary', 'mobile-html']) {
		it(`should call cache get for cached ${endpoint} output`, () => {
			const uri = localUri(endpoint, 'Cat');
			const expectedBody = `Mocked ${endpoint} for cat page`;
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
			server.start({ caching: { enabled: true } });
			return preq.get({ uri }).then((res) => {
				assert.equal(res.body, expectedBody);
				sinon.restore();
				server.stop();
			});
		});

		it(`should call cache set for non-cached ${endpoint} page`, () => {
			const uri = localUri(endpoint, 'Cat');
			const setStub = sinon.stub();
			const engineStubbedInstance = sinon.createStubInstance(cassandra.Engine, {
				get: sinon.stub().returns(Promise.resolve(null)),
				set: setStub,
			});

			sinon.stub(cassandra, 'Engine').returns(engineStubbedInstance);
			server.start({ caching: { enabled: true, ttl: 0 } });

			return preq.get({ uri }).then((res) => {
				sinon.assert.calledOnce(setStub);
				const callArgs = setStub.getCall(0).args;
				const expectedBody = isObject(res.body)
					? JSON.stringify(res.body)
					: res.body;
				assert.equal(callArgs[0], `/en.wikipedia.org/v1/page/${endpoint}/Cat`);
				assert.equal(callArgs[1], 'en.wikipedia.org');
				assert.equal(
					Object.keys(callArgs[2]).every(
						(val) => Object.keys(res.headers).indexOf(val) >= 0
					),
					true
				);
				assert.equal(callArgs[3].equals(Buffer.from(expectedBody)), true);
				assert.equal(callArgs[4], 0);
				sinon.restore();
				server.stop();
			});
		});
	}
});
