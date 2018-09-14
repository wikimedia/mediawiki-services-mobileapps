'use strict';

const preq = require('preq');
const assert = require('../../utils/assert');
const server = require('../../utils/server');


describe('most-read articles', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => server.start());

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
