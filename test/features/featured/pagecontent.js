'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert');
const server = require('../../utils/server');
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

    before(() => server.start());

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

    it('Missing TFA should return 204', () => {
        return preq.get({
            uri: `${server.config.uri}en.wikipedia.org/v1/page/featured/${dateString}`
        })
        .then((res) => {
            assert.status(res, 204);
            assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
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
