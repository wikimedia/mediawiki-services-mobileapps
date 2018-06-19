'use strict';

const preq = require('preq');
const assert = require('../../utils/assert');
const server = require('../../utils/server');
const checkHeaders = require('../../utils/headers').checkHeaders;
const contentType = require('../../utils/headers').CSS_CONTENT_TYPE_REGEX;
const css = require('../../../lib/css').testing;

const localUri = path => `${server.config.uri}meta.wikimedia.org/v1/data/css/mobile${path}`;

describe('css', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => server.start());

    ['/base', '/site', '/pagelib'].forEach((cssType) => {
        it(`${cssType} should respond to GET request with expected headers`, () => {
            return checkHeaders(localUri(cssType), contentType, 'cache-control');
        });

        it(`${cssType} response should have non-zero length`, () => {
            return preq.get(localUri(cssType)).then(res => assert.ok(res.body.length > 0));
        });
    });

    it('default RL request wiki uses canonical domain (request should not redirect)', () => {
        return css.load(css.BASE_MODULES).then(res => assert.ok(!res.headers['content-location']));
    });

});
