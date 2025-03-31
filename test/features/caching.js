'use strict';

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const yaml = require('js-yaml');
const preq = require('preq');
const assert = require('../utils/assert.js');
const server = require('../utils/server');
const sinon = require('sinon');
const cassandra = require('@wikimedia/cassandra-storage');
const { initCache, purgeEvents  } = require('../../lib/caching.js');
const { isObject } = require('underscore');
const testUtil = require('../utils/testUtil.js');
const { purgeLanguageVariants } = require('../../lib/caching');

const localUri = (endpoint, title, domain = 'en.wikipedia.org') => `${ server.config.uri }${ domain }/v1/page/${ endpoint }/${ title }`;

describe('Cache config', () => {
	it('should parse config and adapt ca value', () => {
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
				get: sinon.stub().resolves(null),
				set: setStub.resolves(null),
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

describe('Caching events', () => {
	it('should generate resource change and purge events', () => {
		const exampleReq = {
			app: {
				conf: {
					caching: {
						event: {
							stream: {
								change: 'example_change',
								purge: 'example_purge'
							}
						}
					}

				}
			},
			headers: {
				'x-request-id': '1234-abcd'
			},
			params: {
				domain: 'en.wikipedia.org'
			},
			purgePaths: [
				'/example/path/1',
				'/example/path/2'
			]
		};

		// Assert that uri/stream are properly set
		const events = purgeEvents(exampleReq);
		assert.equal(events.length, 4);
		assert.equal(events[0].meta.uri, 'http://en.wikipedia.org/api/rest_v1/example/path/1');
		assert.equal(events[0].meta.stream, 'example_change');
		assert.equal(events[1].meta.uri, 'http://en.wikipedia.org/api/rest_v1/example/path/2');
		assert.equal(events[1].meta.stream, 'example_change');
		assert.equal(events[2].meta.uri, 'http://en.wikipedia.org/api/rest_v1/example/path/1');
		assert.equal(events[2].meta.stream, 'example_purge');
		assert.equal(events[3].meta.uri, 'http://en.wikipedia.org/api/rest_v1/example/path/2');
		assert.equal(events[3].meta.stream, 'example_purge');

		// Assert that events are validate against resource change schema
		const schemaURL = 'https://schema.wikimedia.org/repositories/primary/jsonschema/resource_change/latest.yaml';
		preq.get(schemaURL).then((res) => {
			const ajv = new Ajv();
			addFormats(ajv);
			const schema = yaml.load(res.body);
			// Fixup schema identifier as ajv expects it
			schema.$schema = 'http://json-schema.org/draft-07/schema';
			ajv.addSchema(schema, 'resource_change');
			const validate = ajv.getSchema('resource_change');
			assert.ok(validate(events[0]));
			assert.ok(validate(events[1]));
			assert.ok(validate(events[2]));
			assert.ok(validate(events[3]));
		});
	});
});

describe('Caching hooks', () => {

	it('should call hit hook on content hit', async () => {
		const mockUpdateHook = sinon.mock();
		const mockHitHook = sinon.mock();
		const middleware = cassandra.middlewareFactory(
			(req) => req.originalUrl,
			(req) => req.params.domain,
			mockUpdateHook,
			mockHitHook
		);

		const engine = sinon.createStubInstance(cassandra.Engine, {
			get: sinon.stub().returns(
				Promise.resolve({
					headers: {},
					value: Buffer.from('Mocked content get'),
					cached: new Date(),
				})
			),
		});
		sinon.stub(cassandra, 'Engine').returns(engine);
		sinon.stub(cassandra, 'middlewareFactory').returns(middleware);
		const svc = await server.start({ caching: { enabled: true } });
		const uri = localUri('mobile-html', 'Cat');
		return preq.get({ uri }).then((res) => {
			sinon.assert.notCalled(mockUpdateHook);
			sinon.assert.calledOnce(mockHitHook);
			assert.equal(mockHitHook.args[0][0].url, '/page/mobile-html/Cat');
			sinon.restore();
			svc.stop();
		});
	});

	it('should call update hook on content update', async () => {
		const mockUpdateHook = sinon.mock();
		const mockHitHook = sinon.mock();
		const middleware = cassandra.middlewareFactory(
			(req) => req.originalUrl,
			(req) => req.params.domain,
			mockUpdateHook,
			mockHitHook
		);

		const engine = sinon.createStubInstance(cassandra.Engine, {
			get: sinon.stub().returns(
				Promise.resolve(false)
			),
			set: sinon.stub().returns(
				Promise.resolve({})
			)
		});
		sinon.stub(cassandra, 'Engine').returns(engine);
		sinon.stub(cassandra, 'middlewareFactory').returns(middleware);
		const svc = await server.start({ caching: { enabled: true } });
		const uri = localUri('mobile-html', 'Cat');
		return preq.get({ uri }).then((res) => {
			sinon.assert.notCalled(mockHitHook);
			sinon.assert.calledOnce(mockUpdateHook);
			assert.equal(mockUpdateHook.args[0][0].url, '/page/mobile-html/Cat');
			sinon.restore();
			svc.stop();
		});
	});

});

describe('Language variants - cache GET', async () => {
	let svc, sandbox, engineStubbedInstance;

	beforeEach(async () => {
		sandbox = sinon.createSandbox();
		engineStubbedInstance = sandbox.createStubInstance(cassandra.Engine, {
			get: sandbox.stub().returns(
				Promise.resolve({
					headers: {},
					value: Buffer.from('Mocked response'),
					cached: new Date(),
				})
			),
		});
		sandbox.stub(cassandra, 'Engine').returns(engineStubbedInstance);
		svc = await server.start({ caching: { enabled: true } });
	});

	afterEach(async () => {
		sandbox.restore();
		await svc.stop();
	});

	it('should call cache GET without language variants for language without variants', async () => {
		const uri = localUri('mobile-html', 'Cat', 'en.wikipedia.org');
		await preq.get({ uri });
		sandbox.assert.calledOnce(engineStubbedInstance.get);
		sandbox.assert.calledWith(
			engineStubbedInstance.get,
			'/en.wikipedia.org/v1/page/mobile-html/Cat',
			'en.wikipedia.org'
		);
	});

	it('should call cache GET without language variants for language without variants with bogus accept-language', async () => {
		const uri = localUri('mobile-html', 'Cat', 'en.wikipedia.org');
		const headers = { 'accept-language': 'en-bogus-xxx' };
		await preq.get({ uri, headers });
		sandbox.assert.calledOnce(engineStubbedInstance.get);
		sandbox.assert.calledWith(
			engineStubbedInstance.get,
			'/en.wikipedia.org/v1/page/mobile-html/Cat',
			'en.wikipedia.org'
		);
	});

	it('should call cache GET with language variants for language with variants', async () => {
		const uri = localUri('mobile-html', 'PHP', 'sr.wikipedia.org');
		const res = await preq.get({ uri });
		sinon.assert.calledOnce(engineStubbedInstance.get);
		sinon.assert.calledWith(
			engineStubbedInstance.get,
			'/sr.wikipedia.org/v1/page/mobile-html/PHP',
			'sr.wikipedia.org-sr'
		);
	});

	it('should call cache GET with language variants for language with variants with valid accept-language', async () => {
		const uri = localUri('mobile-html', 'PHP', 'sr.wikipedia.org');
		const headers = { 'accept-language': 'sr-latn' };
		await preq.get({ uri, headers });
		sinon.assert.calledOnce(engineStubbedInstance.get);
		sinon.assert.calledWith(
			engineStubbedInstance.get,
			'/sr.wikipedia.org/v1/page/mobile-html/PHP',
			'sr.wikipedia.org-sr-Latn'
		);
	});

	it('should call cache GET with default language variants for language with variants with bogus accept-language', async () => {
		const uri = localUri('mobile-html', 'PHP', 'sr.wikipedia.org');
		const headers = { 'accept-language': 'sr-bogus-xxx' };
		await preq.get({ uri, headers });
		sinon.assert.calledOnce(engineStubbedInstance.get);
		sinon.assert.calledWith(
			engineStubbedInstance.get,
			'/sr.wikipedia.org/v1/page/mobile-html/PHP',
			'sr.wikipedia.org-sr-Cyrl'
		);
	});
});

describe('Language variants - cache DELETE', async () => {
	let svc, sandbox, engineStubbedInstance;

	beforeEach(async () => {
		sandbox = sinon.createSandbox();
		engineStubbedInstance = sandbox.createStubInstance(cassandra.Engine, {
			delete: sandbox.stub().returns(
				Promise.resolve({})
			),
		});
		sandbox.stub(cassandra, 'Engine').returns(engineStubbedInstance);
		svc = await server.start({ caching: { enabled: true } });
	});

	afterEach(async () => {
		sandbox.restore();
		await svc.stop();
	});

	it('should not call delete for language without variants', async () => {
		const mockReq = testUtil.getMockedServiceReq({
			params: { title: 'Cat', domain: 'en.wikipedia.org' },
			headers: {
				'cache-control': 'no-cache'
			},
		});
		purgeLanguageVariants(mockReq);
		sinon.assert.notCalled(engineStubbedInstance.delete);
	});

	it('should call delete for language with variants', async () => {
		const mockReq = testUtil.getMockedServiceReq({
			params: { title: 'PHP', domain: 'sr.wikipedia.org' },
			headers: {
				'cache-control': 'no-cache'
			},
		});
		mockReq.originalUrl = '/bogus-path';
		mockReq.get.returns('no-cache');
		mockReq.app.cache = engineStubbedInstance;
		purgeLanguageVariants(mockReq);
		sinon.assert.calledTwice(engineStubbedInstance.delete);
		sinon.assert.calledWith(
			engineStubbedInstance.delete,
			'/bogus-path',
			'sr.wikipedia.org-sr-Cyrl'
		);
		sinon.assert.calledWith(
			engineStubbedInstance.delete,
			'/bogus-path',
			'sr.wikipedia.org-sr-Latn'
		);
	});

	it('should call delete for language with variants with accept-language', async () => {
		const mockReq = testUtil.getMockedServiceReq({
			params: { title: 'PHP', domain: 'sr.wikipedia.org' },
			headers: {
				'cache-control': 'no-cache',
				'accept-language': 'sr-Latn'
			},
		});
		mockReq.originalUrl = '/bogus-path';
		mockReq.get.returns('no-cache');
		mockReq.app.cache = engineStubbedInstance;
		purgeLanguageVariants(mockReq);
		sinon.assert.calledTwice(engineStubbedInstance.delete);
		sinon.assert.calledWith(
			engineStubbedInstance.delete,
			'/bogus-path',
			'sr.wikipedia.org-sr'
		);
		sinon.assert.calledWith(
			engineStubbedInstance.delete,
			'/bogus-path',
			'sr.wikipedia.org-sr-Cyrl'
		);
	});

	it('should call delete for language with variants with bogus accept-language', async () => {
		const mockReq = testUtil.getMockedServiceReq({
			params: { title: 'PHP', domain: 'sr.wikipedia.org' },
			headers: {
				'cache-control': 'no-cache',
				'accept-language': 'xxx'
			},
		});
		mockReq.originalUrl = '/bogus-path';
		mockReq.get.returns('no-cache');
		mockReq.app.cache = engineStubbedInstance;
		purgeLanguageVariants(mockReq);
		sinon.assert.calledTwice(engineStubbedInstance.delete);
		sinon.assert.calledWith(
			engineStubbedInstance.delete,
			'/bogus-path',
			'sr.wikipedia.org-sr-Latn'
		);
		sinon.assert.calledWith(
			engineStubbedInstance.delete,
			'/bogus-path',
			'sr.wikipedia.org-sr-Cyrl'
		);
	});

	it('should call delete for language with variants with valid prefix accept-language', async () => {
		const mockReq = testUtil.getMockedServiceReq({
			params: { title: 'PHP', domain: 'sr.wikipedia.org' },
			headers: {
				'cache-control': 'no-cache',
				'accept-language': 'sr-xxx'
			},
		});
		mockReq.originalUrl = '/bogus-path';
		mockReq.get.returns('no-cache');
		mockReq.app.cache = engineStubbedInstance;
		purgeLanguageVariants(mockReq);
		sinon.assert.calledTwice(engineStubbedInstance.delete);
		sinon.assert.calledWith(
			engineStubbedInstance.delete,
			'/bogus-path',
			'sr.wikipedia.org-sr'
		);
		sinon.assert.calledWith(
			engineStubbedInstance.delete,
			'/bogus-path',
			'sr.wikipedia.org-sr-Latn'
		);
	});

});

describe('Caching headers - vary', async () => {
	let svc;
	beforeEach(async () => {
		svc = await server.start();
	});

	afterEach(async () => {
		await svc.stop();
	});

	it('should not add accept-language in vary header for domain without language variants', async () => {
		const res = await preq.get(localUri('mobile-html', 'Cat', 'en.wikipedia.org'));
		assert.ok('vary' in res.headers);
		assert.ok(!res.headers.vary.includes('accept-language'));
	});

	it('should add accept-language in vary header for domain with language variants', async () => {
		const res = await preq.get(localUri('mobile-html', 'PHP', 'sr.wikipedia.org'));
		assert.ok('vary' in res.headers);
		assert.ok(res.headers.vary.includes('accept-language'));
	});
});
