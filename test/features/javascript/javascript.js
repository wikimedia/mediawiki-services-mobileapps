'use strict';

const preq = require('preq');
const assert = require('../../utils/assert');
const server = require('../../utils/server');

const localUri = path => `${server.config.uri}meta.wikimedia.org/v1/data/javascript/mobile${path}`;

describe('css', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => server.start());

    ['/pagelib'].forEach((jsType) => {
        it(`${jsType} response should have non-zero length`, () => {
            return preq.get(localUri(jsType)).then(res => assert.ok(res.body.length > 0));
        });
    });
});
