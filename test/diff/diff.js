'use strict';

const assert = require('../utils/assert.js');
const fs = require('fs');
const preq = require('preq');
const server = require('../utils/server.js');
const testSpec = require('./test-spec');

describe('diff', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => server.start());

    const buildUri = (path) => {
        return `${server.config.uri}${path}`;
    };

    /**
     * @param {!Object} rsp response object
     * @return {!string} pretty-printed JSON with some properties removed
     */
    const formatOutput = (rsp) => {
        return JSON.stringify(rsp.body, null, 2);
    };

    if (testSpec.UPDATE_EXPECTED_RESULTS) {
        for (const spec of testSpec.TEST_SPECS) {
            it(`Update expected result for ${spec.testName()}`, () => {
                return preq.get({ uri: buildUri(spec.uriPath()) })
                .then((rsp) => {
                    // console.log(`mcs headers.etag: ${rsp.headers.etag}`);
                    const processedResponse = spec.postProcessing(rsp);
                    fs.writeFileSync(spec.filePath(), formatOutput(processedResponse), 'utf8');
                });
            });
        }

        after(() => {
            /* eslint-disable no-console */
            console.log(`\nConsider updating test-spec.js file with:`);
            for (const spec of testSpec.TEST_SPECS) {
                console.log(spec.generator());
            }
            /* eslint-enable no-console */
        });

    } else {
        // Verify step:
        for (const spec of testSpec.TEST_SPECS) {
            it(`${spec.testName()}`, () => {
                return preq.get({ uri: buildUri(spec.uriPath()),
                    headers: 'cache-control: no-cache' })
                           .then((rsp) => {
                               const content = fs.readFileSync(spec.filePath(), 'utf8');
                               spec.postProcessing(rsp);
                               assert.equal(formatOutput(rsp), content);
                           });
            });
        }
    }
});
