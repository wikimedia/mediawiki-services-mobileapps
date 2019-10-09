'use strict';

const assert = require('../../utils/assert.js');
const preq   = require('preq');
const server = require('../../utils/server.js');

describe('featured-image', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => server.start());

    it('incomplete date should return 404', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/media/image/featured/2016/04`;
        return preq.get({ uri })
            .then((res) => {
                throw new Error(`Expected an error, but got status: ${res.status}`);
            }, (err) => {
                assert.status(err, 404);
            });
    });

    it('extra uri path parameter after date should return 404', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/media/image/featured/2016/04/15/11`;
        return preq.get({ uri })
            .then((res) => {
                throw new Error(`Expected an error, but got status: ${res.status}`);
            }, (err) => {
                assert.status(err, 404);
            });
    });

});
