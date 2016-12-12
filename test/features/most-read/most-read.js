'use strict';

const preq = require('preq');
const assert = require('../../utils/assert');
const server = require('../../utils/server');
const headers = require('../../utils/headers');
const testUtil = require('../../utils/testUtil');
const BLACKLIST = require('../../../etc/feed/blacklist');

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

const date = new Date();
const beforeDate = addDays(date, -5);
const dateString = testUtil.constructTestDate(beforeDate);
const afterDate = addDays(date, 5);
const futureDateString = testUtil.constructTestDate(afterDate);

describe('most-read articles', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/most-read/${dateString}`;
        return headers.checkHeaders(uri);
    });

    it('results list should have expected properties', () => {
        const mergeUriPrefix = "https://en.wikipedia.org/api/rest_v1/page/summary/";
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/most-read/${dateString}`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.date);
                assert.ok(res.body.articles.length);
                res.body.articles.forEach((elem) => {
                    assert.ok(elem.$merge && elem.$merge[0], '$merge uri should be present');
                    const title = elem.$merge[0].substring(mergeUriPrefix.length);
                    assert.ok(BLACKLIST.indexOf(title) === -1, 'blacklisted title');
                });
            });
    });

    it('should load successfully even with no normalizations from the MW API', () => {
        const mergeUriPrefix = "https://ja.wikipedia.org/api/rest_v1/page/summary/";
        const uri = `${server.config.uri}ja.wikipedia.org/v1/page/most-read/2016/06/15`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.date);
                assert.ok(res.body.articles.length);
                res.body.articles.forEach((elem) => {
                    assert.ok(elem.$merge && elem.$merge[0], '$merge uri should be present');
                    const title = elem.$merge[0].substring(mergeUriPrefix.length);
                    assert.ok(BLACKLIST.indexOf(title) === -1, 'blacklisted title');
                });
            });
    });

    it('Request to mobile domain should complete successfully', () => {
        const uri = `${server.config.uri}en.m.wikipedia.org/v1/page/most-read/${dateString}`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
            });
    });

    it('Request for future date should return 204 when aggregated flag is set', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/most-read/${futureDateString}`;
        return preq.get({ uri, query: { aggregated: true } })
            .then((res) => {
                assert.status(res, 204);
                assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
            });
    });

    it('Should throw 404 for request with no results', () => {
        const uri = `${server.config.uri}zh-classical.wikipedia.org/v1/page/most-read/2016/11/12`;
        return preq.get({ uri })
            .then((res) => {
                throw new Error(`Expected an error but got status: ${res.status}`);
            }, (err) => {
                assert.status(err, 404);
            });
    });

    it('Should return 204 for request with no results, aggregated=true', () => {
        const uri = `${server.config.uri}zh-classical.wikipedia.org/v1/page/most-read/2016/11/12`;
        return preq.get({ uri, query: { aggregated: true } })
            .then((res) => {
                assert.status(res, 204);
                assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
            });
    });
});
