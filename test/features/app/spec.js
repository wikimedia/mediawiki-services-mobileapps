'use strict';

const preq = require('preq');
const refParser = require('@apidevtools/json-schema-ref-parser');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');
const URI = require('swagger-router').URI;
const specLib = require('../../../lib/spec.js');
const OpenAPISchemaValidator = require('openapi-schema-validator').default;

const validator = new OpenAPISchemaValidator({ version: 3 });
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const baseUri = `${ server.config.uri }en.wikipedia.org/v1/`;

function getServiceConfig() {
	return server.config.conf.services[server.config.conf.services.length - 1]
		.conf;
}

async function staticSpecLoad() {
	const myService = getServiceConfig();
	const specPath = `${ __dirname }/../../../${
		myService.spec ? myService.spec : 'spec'
	}`;

	try {
		return await refParser.dereference(specLib.load(specPath, {}));
	} catch (err) {
		return {
			paths: {},
			'x-default-params': {},
			'x-restbase-compatibility-headers': {},
		};
	}
}

function validateExamples(pathStr, defParams, mSpec) {
	const uri = new URI(pathStr, {}, true);

	if (!mSpec) {
		try {
			uri.expand(defParams);
			return true;
		} catch (e) {
			throw new Error(`Missing parameter for route ${ pathStr } : ${ e.message }`);
		}
	}

	if (!Array.isArray(mSpec)) {
		throw new Error(`Route ${ pathStr } : x-amples must be an array!`);
	}

	mSpec.forEach((ex, idx) => {
		if (!ex.title) {
			throw new Error(`Route ${ pathStr }, example ${ idx }: title missing!`);
		}
		ex.request = ex.request || {};
		try {
			uri.expand(Object.assign({}, defParams, ex.request.params || {}));
		} catch (e) {
			throw new Error(
				`Route ${ pathStr }, example ${ idx } (${ ex.title }): missing parameter: ${ e.message }`
			);
		}
	});

	return true;
}

function constructTestCase(title, path, method, request, response) {
	return {
		title,
		request: {
			uri: server.config.uri + (path[0] === '/' ? path.slice(1) : path),
			method,
			headers: request.headers || {},
			query: request.query,
			body: request.body,
			followRedirect: false,
		},
		response: {
			status: response.status || 200,
			headers: response.headers || {},
			body: response.body,
		},
	};
}

function constructTests(paths, defParams, defHeaders) {
	const ret = [];

	Object.keys(paths).forEach((pathStr) => {
		Object.keys(paths[pathStr]).forEach((method) => {
			const p = paths[pathStr][method];
			if ({}.hasOwnProperty.call(p, 'x-monitor') && !p['x-monitor']) {
				return;
			}
			const uri = new URI(pathStr, {}, true);
			if (!p['x-amples']) {
				ret.push(
					constructTestCase(
						pathStr,
						uri.toString({ params: defParams }),
						method,
						{},
						{ headers: defHeaders }
					)
				);
				return;
			}
			p['x-amples'].forEach((ex) => {
				ex.request = ex.request || {};
				ex.response.headers = Object.assign(
					ex.response.headers || {},
					defHeaders
				);
				ret.push(
					constructTestCase(
						ex.title,
						uri.toString({
							params: Object.assign({}, defParams, ex.request.params || {}),
						}),
						method,
						ex.request,
						ex.response || {}
					)
				);
			});
		});
	});

	return ret;
}

function cmp(result, expected, errMsg) {
	if (expected === null || expected === undefined) {
		// nothing to expect, so we can return
		return true;
	}
	if (result === null || result === undefined) {
		result = '';
	}

	if (expected.constructor === Object) {
		Object.keys(expected).forEach((key) => {
			const val = expected[key];
			assert.deepEqual(
				{}.hasOwnProperty.call(result, key),
				true,
				`Body field ${ key } not found in response!`
			);
			cmp(result[key], val, `${ key } body field mismatch!`);
		});
		return true;
	} else if (expected.constructor === Array) {
		if (result.constructor !== Array) {
			assert.deepEqual(result, expected, errMsg);
			return true;
		}
		// only one item in expected - compare them all
		if (expected.length === 1 && result.length > 1) {
			result.forEach((item) => {
				cmp(item, expected[0], errMsg);
			});
			return true;
		}
		// more than one item expected, check them one by one
		if (expected.length !== result.length) {
			assert.deepEqual(result, expected, errMsg);
			return true;
		}
		expected.forEach((item, idx) => {
			cmp(result[idx], item, errMsg);
		});
		return true;
	}

	if (
		expected.length > 1 &&
    expected[0] === '/' &&
    expected[expected.length - 1] === '/'
	) {
		if (new RegExp(expected.slice(1, -1)).test(result)) {
			return true;
		}
	} else if (expected.length === 0 && result.length === 0) {
		return true;
	} else if (result === expected || result.startsWith(expected)) {
		return true;
	}

	assert.deepEqual(result, expected, errMsg);
	return true;
}

function validateTestResponse(testCase, res) {
	const expRes = testCase.response;

	// check the status
	assert.status(res, expRes.status);
	// check the headers
	Object.keys(expRes.headers).forEach((key) => {
		const val = expRes.headers[key];
		assert.deepEqual(
			{}.hasOwnProperty.call(res.headers, key),
			true,
			`Header ${ key } not found in response!`
		);
		cmp(res.headers[key], val, `${ key } header mismatch!`);
	});
	// check the body
	if (!expRes.body) {
		return true;
	}
	res.body = res.body || '';
	if (Buffer.isBuffer(res.body)) {
		res.body = res.body.toString();
	}
	if (expRes.body.constructor !== res.body.constructor) {
		if (expRes.body.constructor === String) {
			res.body = JSON.stringify(res.body);
		} else {
			res.body = JSON.parse(res.body);
		}
	}
	// check that the body type is the same
	if (expRes.body.constructor !== res.body.constructor) {
		throw new Error(
			`Expected body type ${ expRes.body.constructor } but got ${ res.body.constructor }`
		);
	}

	// compare the bodies
	cmp(res.body, expRes.body, 'Body mismatch!');

	return true;
}

describe('Swagger spec', function () {
	let spec, defParams;
	this.timeout(30000);

	let svc;
	before(async () => {
		spec = await staticSpecLoad();
		svc = await server.start();
	});

	after(async () => {
		await svc.stop();
	});

	it('get the spec', () => preq.get(`${ server.config.uri }?spec`).then((res) => {
		assert.status(200);
		assert.contentType(res, 'application/json');
		assert.notDeepEqual(res.body, undefined, 'No body received!');
		assert.deepEqual(
			{ errors: [] },
			validator.validate(res.body),
			'Spec must have no validation errors'
		);
	}));

	it('spec validation', () => {
		defParams = {};
		if (spec['x-default-params']) {
			defParams = spec['x-default-params'];
		}
		// check the high-level attributes
		['info', 'openapi', 'paths'].forEach((prop) => {
			assert.deepEqual(!!spec[prop], true, `No ${ prop } field present!`);
		});
		// no paths - no love
		assert.deepEqual(
			!!Object.keys(spec.paths),
			true,
			'No paths given in the spec!'
		);
		// now check each path
		Object.keys(spec.paths).forEach((pathStr) => {
			assert.deepEqual(!!pathStr, true, 'A path cannot have a length of zero!');
			const path = spec.paths[pathStr];
			assert.deepEqual(
				!!Object.keys(path),
				true,
				`No methods defined for path: ${ pathStr }`
			);
			Object.keys(path).forEach((method) => {
				const mSpec = path[method];
				if ({}.hasOwnProperty.call(mSpec, 'x-monitor') && !mSpec['x-monitor']) {
					return;
				}
				validateExamples(pathStr, defParams, mSpec['x-amples']);
			});
		});
	});
});

describe('validate responses against schema', function () {
	this.timeout(30000);
	let svc, spec;
	const ajv = new Ajv({});
	addFormats(ajv, { formats: ['date-time'] });
	ajv.addKeyword({ keyword: 'example', type: 'string' });
	const assertValidSchema = (uri, schemaPath) => preq.get({ uri }).then((res) => {
		if (!ajv.validate(schemaPath, res.body)) {
			throw new assert.AssertionError({ message: ajv.errorsText() });
		}
	});

	before(async () => {
		spec = await staticSpecLoad();
		Object.keys(spec.components.schemas).forEach((defName) => {
			ajv.addSchema(
				spec.components.schemas[defName],
				`#/components/schemas/${ defName }`
			);
		});
		svc = await server.start();
	});

	after(async () => {
		await svc.stop();
	});

	it('summary response should conform to schema', () => {
		const uri = `${ baseUri }page/summary/Dubai/808803658`;
		return assertValidSchema(uri, '#/components/schemas/summary');
	});
	it('media-list response should conform to schema', () => {
		const uri = `${ baseUri }page/media-list/Hummingbird`;
		return assertValidSchema(uri, '#/components/schemas/media_list');
	});
});

describe('validate spec examples', () => {
	let spec, svc, defParams, defHeaders;
	const expectedFailureTests = [
		"retrieve en-wiktionary definitions for 'cat'",
		'retrieve test page via mobile-sections',
		'Get media list from test page',
		'Get page content HTML for test page',
		'Get summary for test page',
	];

	const expectedFailure = {
		withErr: (err) => err.message === 'Header content-language not found in response!',
		forTest: (testCase) => expectedFailureTests.includes(testCase.title),
		description: 'Missing upstream implementation of language variants',
	};

	before(async () => {
		spec = await staticSpecLoad();
		svc = await server.start();
		defParams = spec['x-default-params'] || {};
		defHeaders = {};
		if (
			svc._impl.config.services[0].conf.restbase_compatibility &&
			svc._impl.config.services[0].conf.restbase_compatibility.security_headers
		) {
			// default headers, if given
			defHeaders = spec['x-restbase-compatibility-headers'] || {};
		}
	});

	after(async () => {
		await svc.stop();
	});

	it('Should validate tests', async function (done) {
		this.timeout(20000);
		for (const testCase of constructTests(spec.paths, defParams, defHeaders)) {
			try {
				const res = await preq(testCase.request);
				try {
					validateTestResponse(testCase, res);
				} catch (testErr) {
					if (expectedFailure.forTest(testCase) &&
						expectedFailure.withErr(testErr)) {
						this.skip(expectedFailure.description);
					} else {
						throw testErr;
					}
				}
			} catch (err) {
				try {
					validateTestResponse(testCase, err);
				} catch (testErr) {
					if (expectedFailure.forTest(testCase) &&
							expectedFailure.withErr(testErr)) {
						this.skip(expectedFailure.description);
					} else {
						throw testErr;
					}
				}
			}
		}
		done();
	});
});
