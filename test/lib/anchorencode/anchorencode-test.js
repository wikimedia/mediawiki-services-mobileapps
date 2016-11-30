/* eslint-env mocha */

'use strict';

const assert = require('../../utils/assert.js');
const a = require('../../../lib/anchorencode');

describe('lib:anchorencode', function() {

    /* eslint no-invalid-this: "off" */
    this.timeout(20000);

    it('anchorencode(empty) should return an empty string', () => {
        assert.deepEqual(a.anchorencode(''), '');
    });

    it('anchorencode("a") should return a', () => {
        assert.deepEqual(a.anchorencode('a'), 'a');
    });

    it('anchorencode("Z") should return Z', () => {
        assert.deepEqual(a.anchorencode('Z'), 'Z');
    });

    it('anchorencode("  Z  ") should return Z', () => {
        assert.deepEqual(a.anchorencode('  Z  '), 'Z');
    });

    it('anchorencode("a b c") should return a_b_c', () => {
        assert.deepEqual(a.anchorencode('a b c'), 'a_b_c');
    });

    it('anchorencode("a  b  c") should return a_b_c', () => {
        assert.deepEqual(a.anchorencode('a  b  c'), 'a_b_c');
    });

    it('anchorencode("!@#$%^&*()") should return 21.40.23.24.25.5E.26.2A.28.29', () => {
        assert.deepEqual(a.anchorencode('!@#$%^&*()'), '21.40.23.24.25.5E.26.2A.28.29');
    });

    it('anchorencode(":") should not be converted', () => {
        assert.deepEqual(a.anchorencode(':'), ':');
    });
});
