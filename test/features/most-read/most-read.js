'use strict';

const preq = require('preq');
const assert = require('../../utils/assert');
const dateUtil = require('../../../lib/dateUtil');
const server = require('../../utils/server');
const headers = require('../../utils/headers');
const testUtil = require('../../utils/testUtil');
const BLACKLIST = require('../../../etc/feed/blacklist');

const date = new Date();
const beforeDate = dateUtil.addDays(date, -5);
const dateString = testUtil.constructTestDate(beforeDate);
const afterDate = dateUtil.addDays(date, 5);
const futureDateString = testUtil.constructTestDate(afterDate);

describe('most-read articles', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => server.start());

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

    it('Should contain pageview history', () => {
        const nextDay = new Date('2017-01-02Z');
        const uri = `${server.config.uri}es.wikipedia.org/v1/page/most-read/2017/01/01`;
        return preq.get({ uri })
            .then((res) => {
                res.body.articles.forEach((article) => {
                    assert.deepEqual(article.view_history.length, 5);
                    for (const history of article.view_history) {
                        assert.ok(history.views > 0);
                        assert.ok(new Date(history.date) < nextDay);
                    }
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

    it('Request for future date should return 204 when aggregated flag is set', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/most-read/${futureDateString}`;
        return preq.get({ uri, query: { aggregated: true } })
            .then((res) => {
                assert.status(res, 204);
                assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
            });
    });

    it('Should provide pageviews from day prior when aggregated flag is set', () => {
        const dayPrior = '2016-12-31Z';
        const uri = `${server.config.uri}da.wikipedia.org/v1/page/most-read/2017/01/01`;
        return preq.get({ uri, query: { aggregated: true } })
            .then((res) => {
                assert.deepEqual(res.body.articles[0].view_history[4].date, dayPrior);
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

    it('Should return 204 for fywiki requests', () => {
        const uri = `${server.config.uri}fy.wikipedia.org/v1/page/most-read/2016/11/12`;
        return preq.get({ uri })
            .then((res) => {
                assert.status(res, 204);
                assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
            });
    });
});
