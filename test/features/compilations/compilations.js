'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');
const headers = require('../../utils/headers.js');

describe('compilations', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => {
        return server.start();
    });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        return headers.checkHeaders(`${server.config.uri}en.wikipedia.org/v1/compilations`);
    });

    // todo: update when spec is finalized
    it('should return a valid response', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/compilations` })
            .then((res) => {
                assert.status(res, 200);
                assert.equal(res.headers['cache-control'], 'public, max-age=7200, s-maxage=14400');
                res.body.compilations.forEach((elem) => {
                    assert.ok(elem.name, 'name should be present');
                    assert.ok(typeof elem.count === 'number', 'count should be present & valid');
                    assert.ok(typeof elem.size === 'number', 'size should be present & valid');
                    assert.ok(typeof elem.timestamp === 'number', 'timestamp should be present');
                });
            });
    });

    it('should return 0 compilations', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/compilations` })
            .then((res) => {
                assert.ok(res.body.compilations.length === 0);
            });
    });
});
