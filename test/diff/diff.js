'use strict';

const assert = require('../utils/assert.js');
const fs = require('fs');
const preq = require('preq');
const server = require('../utils/server.js');
const testSpec = require('./test-spec');

describe('diff', function() {

	this.timeout(20000);

	let svc;
	before(async () => {
		svc = await server.start();
	});
	after(async () => await svc.stop());

	const buildUri = (path) => `${ server.config.uri }${ path }`;

	/**
	 * @param {!Object} rsp response object
	 * @return {!string} pretty-printed JSON with some properties removed
	 */
	const formatOutput = (rsp) => rsp.body;

	function buildRequestParams(build, spec) {
		const requestParams = {
			uri: build(spec.uriPath()),
			headers: spec.getHeaders()
		};
		if (spec.getPayloadFile()) {
			requestParams.body = fs.readFileSync(spec.getPayloadFile(), 'utf8');
		}
		return requestParams;
	}

	function writeExpectedResultsToFile(spec, rsp, format) {
		// console.log(`mcs headers.etag: ${rsp.headers.etag}`);
		const processedResponse = spec.postProcessing(rsp);
		fs.writeFileSync(spec.filePath(), format(processedResponse), 'utf8');
	}

	function verifyResult(spec, rsp) {
		const content = fs.readFileSync(spec.filePath(), 'utf8');
		spec.postProcessing(rsp);
		assert.equal(formatOutput(rsp), content);
	}

	if (testSpec.UPDATE_EXPECTED_RESULTS) {
		for (const spec of testSpec.TEST_SPECS) {
			it(`Update expected result for ${ spec.testName() }`, () => {
				const requestParams = buildRequestParams(buildUri, spec);
				switch (spec.getHttpMethod()) {
					case 'GET':
						return preq.get(requestParams)
							.then((rsp) => writeExpectedResultsToFile(spec, rsp, formatOutput));
					case 'POST':
						return preq.post(requestParams)
							.then((rsp) => writeExpectedResultsToFile(spec, rsp, formatOutput));
					default:
						assert.fail(`http method ${ spec.getHttpMethod() } not implemented`);
				}
			});
		}

		after(() => {
			console.log('\nConsider updating test-spec.js file with:');
			for (const spec of testSpec.TEST_SPECS) {
				console.log(spec.generator());
			}

		});

	} else {
		// Verify step:
		for (const spec of testSpec.TEST_SPECS) {
			it(`${ spec.testName() }`, () => {
				const requestParams = buildRequestParams(buildUri, spec);
				switch (spec.getHttpMethod()) {
					case 'GET':
						return preq.get(requestParams)
							.then((rsp) => verifyResult(spec, rsp));
					case 'POST':
						return preq.post(requestParams)
							.then((rsp) => verifyResult(spec, rsp));
					default:
						assert.fail(`http method ${ spec.getHttpMethod() } not implemented`);
				}
			});
		}
	}
});
