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

    before(() => { return server.start(); });

    it('/base should respond to GET request with expected headers', () => {
        return checkHeaders(localUri('/base'), contentType, 'cache-control');
    });

    it('/site should respond to GET request with expected headers', () => {
        return checkHeaders(localUri('/site'), contentType, 'cache-control');
    });

    it('/base response should have nonzero length', () => {
        return preq.get(localUri('/base')).then(res => assert.ok(res.body.length > 0));
    });

    it('/site response should have nonzero length', () => {
        return preq.get(localUri('/site')).then(res => assert.ok(res.body.length > 0));
    });

    it('default RL request wiki uses canonical domain (request should not redirect)', () => {
        return css.load(css.BASE_MODULES).then(res => assert.ok(!res.headers['content-location']));
    });

});
