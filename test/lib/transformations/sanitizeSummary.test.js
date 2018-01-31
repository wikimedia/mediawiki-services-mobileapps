'use strict';

const assert = require('./../../utils/assert.js');
const sanitizeSummary = require('./../../../lib/transformations/sanitizeSummary');
const regex = sanitizeSummary.testing;

describe('lib:sanitizeSummary', () => {
    const makeLongString = () => {
        const template = 'abcdefghij';
        let result = '';
        for (let i = 0; i < 20; i++) {
            result += template;
        }
        return result;
    };
    const longString = makeLongString();
    const tooLongString = `${longString}a`;

    describe('regular expressions', () => {
        it('ANY_REGEX matches', () => {
            assert.ok(regex.ANY_REGEX.test('a'));
            assert.ok(regex.ANY_REGEX.test(longString));
        });
        it('ANY_REGEX does not match', () => {
            assert.ok(!regex.ANY_REGEX.test(''));
            assert.ok(!regex.ANY_REGEX.test(tooLongString));
        });

        it('DECIMAL_REGEX matches', () => {
            assert.ok(regex.DECIMAL_REGEX.test('1.2'));
            assert.ok(regex.DECIMAL_REGEX.test('-1.2'));
        });
        it('DECIMAL_REGEX does not match', () => {
            assert.ok(!regex.DECIMAL_REGEX.test('a'));
            assert.ok(!regex.DECIMAL_REGEX.test(' '));
        });

        it('CSS_SIZE_REGEX matches', () => {
            assert.ok(regex.CSS_SIZE_REGEX.test('1.0cm'));
            assert.ok(regex.CSS_SIZE_REGEX.test('-20px'));
            assert.ok(regex.CSS_SIZE_REGEX.test('30%'));
        });
        it('CSS_SIZE_REGEX does not match', () => {
            assert.ok(!regex.CSS_SIZE_REGEX.test('a'));
            assert.ok(!regex.CSS_SIZE_REGEX.test(' '));
            assert.ok(!regex.CSS_SIZE_REGEX.test('1'));
            assert.ok(!regex.CSS_SIZE_REGEX.test('20px and more'));
        });

        it('SINGLE_STRING_REGEX matches', () => {
            assert.ok(regex.SINGLE_STRING_REGEX.test('green'));
            assert.ok(regex.SINGLE_STRING_REGEX.test('foo-bar')); // TODO: disallow
            assert.ok(regex.SINGLE_STRING_REGEX.test('-20px')); // TODO: disallow
            assert.ok(regex.SINGLE_STRING_REGEX.test(longString));
        });
        it('SINGLE_STRING_REGEX does not match', () => {
            assert.ok(!regex.SINGLE_STRING_REGEX.test(' '));
            assert.ok(!regex.SINGLE_STRING_REGEX.test('green and more'));
            assert.ok(!regex.SINGLE_STRING_REGEX.test('30%'));
            assert.ok(!regex.SINGLE_STRING_REGEX.test('foo:'));
            assert.ok(!regex.SINGLE_STRING_REGEX.test(tooLongString));
        });

        it('HEX_REGEX matches', () => {
            assert.ok(regex.HEX_REGEX.test('#1ac'));
            assert.ok(regex.HEX_REGEX.test('#1A2b3c'));
            assert.ok(regex.HEX_REGEX.test('#1a2B3c4d'));
        });
        it('HEX_REGEX does not match', () => {
            assert.ok(!regex.HEX_REGEX.test('1ac'));
            assert.ok(!regex.HEX_REGEX.test('#1ac and more'));
            assert.ok(!regex.HEX_REGEX.test('30%'));
            assert.ok(!regex.HEX_REGEX.test('foo:'));
        });

        it('RGB_REGEX matches', () => {
            assert.ok(regex.RGB_REGEX.test('rgb(34, 12, 64, 0.6)'));
            assert.ok(regex.RGB_REGEX.test('rgba(34,12,64,.6)'));
            assert.ok(regex.RGB_REGEX.test('rgb(34 12 64 / 0.6)'));
            assert.ok(regex.RGB_REGEX.test('rgba(34 12 64 / .6)'));
            assert.ok(regex.RGB_REGEX.test('rgb(34.0 12 64 / 60%)'));
            assert.ok(regex.RGB_REGEX.test('rgba(34.6 12 64 / 30%)'));
        });
        it('RGB_REGEX does not match', () => {
            assert.ok(!regex.RGB_REGEX.test('not starting with rgb'));
            assert.ok(!regex.RGB_REGEX.test('rgb()'));
            assert.ok(!regex.RGB_REGEX.test('rgb(34, 12, 64, 0.6) and more'));
        });

        it('HSL_REGEX matches', () => {
            assert.ok(regex.HSL_REGEX.test('hsl(270,60%,70%)'));
            assert.ok(regex.HSL_REGEX.test('hsl(270, 60%, 70%)'));
            assert.ok(regex.HSL_REGEX.test('hsl(240 100% 50%)'));
            assert.ok(regex.HSL_REGEX.test('hsl(270deg, 60%, 70%)'));
            assert.ok(regex.HSL_REGEX.test('hsl(4.71239rad, 60%, 70%)'));
            assert.ok(regex.HSL_REGEX.test('hsl(.75turn, 60%, 70%)'));

            assert.ok(regex.HSL_REGEX.test('hsla(240, 100%, 50%, .05)'));
            assert.ok(regex.HSL_REGEX.test('hsla(240, 100%, 50%, 1)'));
            assert.ok(regex.HSL_REGEX.test('hsla(240 100% 50% / .05)'));
            assert.ok(regex.HSL_REGEX.test('hsla(240 100% 50% / 5%)'));
        });
        it('HSL_REGEX does not match', () => {
            assert.ok(!regex.HSL_REGEX.test('1ac'));
            assert.ok(!regex.HSL_REGEX.test('hsl(34, 12, 64, 0.6) and more'));
            assert.ok(!regex.HSL_REGEX.test('30%'));
            assert.ok(!regex.HSL_REGEX.test('foo:'));
        });
    });
});
