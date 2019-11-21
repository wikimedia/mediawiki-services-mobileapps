'use strict';

const assert = require('../utils/assert.js');
const fs = require('fs');
const preq = require('preq');
const server = require('../utils/server.js');
const testSpec = require('./test-spec');

describe('diff', function() {

    this.timeout(20000);

    before(() => server.start());

    const buildUri = (path) => {
        return `${server.config.uri}${path}`;
    };

    /**
     * @param {!Object} rsp response object
     * @return {!string} pretty-printed JSON with some properties removed
     */
    const formatOutput = (rsp) => {
        return rsp.body;
    };

    function buildRequestParams(buildUri, spec) {
        const requestParams = {
            uri: buildUri(spec.uriPath()),
            headers: spec.getHeaders()
        };
        if (spec.getPayloadFile()) {
            requestParams.body = fs.readFileSync(spec.getPayloadFile(), 'utf8');
        }
        return requestParams;
    }

    function writeExpectedResultsToFile(spec, rsp, formatOutput) {
        // console.log(`mcs headers.etag: ${rsp.headers.etag}`);
        const processedResponse = spec.postProcessing(rsp);
        fs.writeFileSync(spec.filePath(), formatOutput(processedResponse), 'utf8');
    }

    function verifyResult(spec, rsp) {
        const content = fs.readFileSync(spec.filePath(), 'utf8');
        spec.postProcessing(rsp);
        assert.equal(formatOutput(rsp), content);
    }

    if (testSpec.UPDATE_EXPECTED_RESULTS) {
        for (const spec of testSpec.TEST_SPECS) {
            it(`Update expected result for ${spec.testName()}`, () => {
                const requestParams = buildRequestParams(buildUri, spec);
                switch (spec.getHttpMethod()) {
                case 'GET':
                    return preq.get(requestParams)
                    .then((rsp) => {
                        return writeExpectedResultsToFile(spec, rsp, formatOutput);
                    });
                case 'POST':
                    return preq.post(requestParams)
                    .then((rsp) => {
                        return writeExpectedResultsToFile(spec, rsp, formatOutput);
                    });
                default:
                    assert.fail(`http method ${spec.getHttpMethod()} not implemented`);
                }
            });
        }

        after(() => {
            /* eslint-disable no-console */
            console.log('\nConsider updating test-spec.js file with:');
            for (const spec of testSpec.TEST_SPECS) {
                console.log(spec.generator());
            }
            /* eslint-enable no-console */
        });

    } else {
        // Verify step:
        for (const spec of testSpec.TEST_SPECS) {
            it(`${spec.testName()}`, () => {
                const requestParams = buildRequestParams(buildUri, spec);
                switch (spec.getHttpMethod()) {
                    case 'GET':
                        return preq.get(requestParams)
                        .then((rsp) => {
                            return verifyResult(spec, rsp);
                        });
                    case 'POST':
                        return preq.post(requestParams)
                        .then((rsp) => {
                            return verifyResult(spec, rsp);
                        });
                    default:
                        assert.fail(`http method ${spec.getHttpMethod()} not implemented`);
                }
            });
        }
    }
});
