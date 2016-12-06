'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert');
const server = require('../../utils/server');
const headers = require('../../utils/headers');
const testUtil = require('../../utils/testUtil');

function nextYear() {
    const result = new Date();
    result.setUTCFullYear(result.getUTCFullYear() + 1);
    return result;
}

const testDate = nextYear();
const dateString = testUtil.constructTestDate(testDate);

describe('featured', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/featured/2016/04/15`;
        return headers.checkHeaders(uri);
    });

    it('featured article of 4/15/2016 should have expected properties', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/featured/2016/04/15` })
            .then((res) => {
                assert.status(res, 200);
                assert.ok(res.headers.etag.indexOf('50089449') === 0);
                assert.equal(res.body.$merge, 'https://en.wikipedia.org/api/rest_v1/page/summary/Cosmic_Stories_and_Stirring_Science_Stories');
            });
    });

    it('featured article of 4/29/2016 should have a description', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/featured/2016/04/29` })
            .then((res) => {
                assert.status(res, 200);
                assert.ok(res.headers.etag.indexOf('50282338') === 0);
                assert.equal(res.body.$merge, 'https://en.wikipedia.org/api/rest_v1/page/summary/Lightning_(Final_Fantasy)');
            });
    });

    it('incomplete date should return 404', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/featured/2016/04` })
            .then((res) => {
                throw new Error(`Expected an error, but got status: ${res.status}`);
            }, (err) => {
                assert.status(err, 404);
            });
    });

    it('extra uri path parameter after date should return 404', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/featured/2016/04/15/11`;
        return preq.get({ uri })
            .then((res) => {
                throw new Error(`Expected an error, but got status: ${res.status}`);
            }, (err) => {
                assert.status(err, 404);
            });
    });

    it('unsupported language', () => {
        return preq.get({ uri: `${server.config.uri}fr.wikipedia.org/v1/page/featured/2016/04/15` })
            .then((res) => {
                throw new Error(`Expected an error, but got status: ${res.status}`);
            }, (err) => {
                assert.status(err, 501);
                assert.equal(err.body.type, 'unsupported_language');
            });
    });

    it('unsupported language with aggregated=true should return 204', () => {
        return preq.get({
            uri: `${server.config.uri}zh.wikipedia.org/v1/page/featured/2016/04/15`,
            query: { aggregated: true }
        })
        .then((res) => {
            assert.status(res, 204);
            assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
        });
    });

    it('Missing TFA should return 404', () => {
        return preq.get({
            uri: `${server.config.uri}en.wikipedia.org/v1/page/featured/${dateString}`
        })
        .then((res) => {
            assert.fails('This should fail!');
        }, (err) => {
            assert.status(err, 404);
        });
    });

    it('Missing TFA with aggregated=true should return 204', () => {
        return preq.get({
            uri: `${server.config.uri}en.wikipedia.org/v1/page/featured/${dateString}`,
            query: { aggregated: true }
        })
        .then((res) => {
            assert.status(res, 204);
            assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
        }, (err) => {
            assert.fails(`Should not propagate error when aggregated=true!\n\n${err}`);
        });
    });

    it('featured article of an old date should return 404', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/featured/1970/12/31` })
            .then((res) => {
                throw new Error(`Expected an error, but got status: ${res.status}`);
            }, (err) => {
                assert.status(err, 404);
                assert.equal(err.body.type, 'not_found');
            });
    });
});
