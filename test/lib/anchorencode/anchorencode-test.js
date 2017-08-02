'use strict';

const assert = require('../../utils/assert.js');
const anchorencode = require('../../../lib/anchorencode');

describe('lib:anchorencode', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    it('anchorencode(empty) should return an empty string', () => {
        assert.deepEqual(anchorencode(''), '');
    });

    it('anchorencode("a") should return a', () => {
        assert.deepEqual(anchorencode('a'), 'a');
    });

    it('anchorencode("Z") should return Z', () => {
        assert.deepEqual(anchorencode('Z'), 'Z');
    });

    it('anchorencode("  Z  ") should return Z', () => {
        assert.deepEqual(anchorencode('  Z  '), 'Z');
    });

    it('anchorencode("a b c") should return a_b_c', () => {
        assert.deepEqual(anchorencode('a b c'), 'a_b_c');
    });

    it('anchorencode("a  b  c") should return a_b_c', () => {
        assert.deepEqual(anchorencode('a  b  c'), 'a_b_c');
    });

    it('anchorencode("!@#$%^&*()") should return 21.40.23.24.25.5E.26.2A.28.29', () => {
        assert.deepEqual(anchorencode('!@#$%^&*()'), '21.40.23.24.25.5E.26.2A.28.29');
    });

    it('anchorencode(":") should not be converted', () => {
        assert.deepEqual(anchorencode(':'), ':');
    });
});
