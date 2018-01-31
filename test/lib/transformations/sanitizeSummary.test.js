'use strict';

const assert = require('./../../utils/assert.js');
const sanitizeSummary = require('./../../../lib/transformations/sanitizeSummary');
const regex = sanitizeSummary.testing;

describe('lib:sanitizeSummary', () => {
    const makeLongString = () => {
        const template = 'abcdefghij';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += template;
        }
        return result;
    };
    const eightyChars = makeLongString();
    const eightyOneChars = `${eightyChars}a`;

    describe('regular expressions', () => {
        it('ANY_REGEX matches', () => {
            assert.ok(regex.ANY_REGEX.test('a'));
            assert.ok(regex.ANY_REGEX.test(eightyChars));
        });
        it('ANY_REGEX does not match', () => {
            assert.ok(!regex.ANY_REGEX.test(''));
            assert.ok(!regex.ANY_REGEX.test('foo:bar'));
            assert.ok(!regex.ANY_REGEX.test(eightyOneChars));
        });

        it('DECIMAL_REGEX matches', () => {
            assert.ok(regex.DECIMAL_REGEX.test('1'));
            assert.ok(regex.DECIMAL_REGEX.test('0.1'));
            assert.ok(regex.DECIMAL_REGEX.test('.1'));
            assert.ok(regex.DECIMAL_REGEX.test('1.2'));
            assert.ok(regex.DECIMAL_REGEX.test('-1.2'));
        });
        it('DECIMAL_REGEX does not match', () => {
            // not sure about the next one, mainly documenting for now
            assert.ok(!regex.DECIMAL_REGEX.test('1.'), 'needs a number after .');
            assert.ok(!regex.DECIMAL_REGEX.test('.'), 'needs a number after .');
            assert.ok(!regex.DECIMAL_REGEX.test('a1'), 'no letter allowed');
            assert.ok(!regex.DECIMAL_REGEX.test(' '), 'no space allowed');
        });

        it('CSS_SIZE_REGEX matches', () => {
            assert.ok(regex.CSS_SIZE_REGEX.test('1.0cm'));
            assert.ok(regex.CSS_SIZE_REGEX.test('-20px'));
            assert.ok(regex.CSS_SIZE_REGEX.test('30%'));
        });
        it('CSS_SIZE_REGEX does not match', () => {
            assert.ok(!regex.CSS_SIZE_REGEX.test('1'), 'must have a unit');
            assert.ok(!regex.CSS_SIZE_REGEX.test('a1px'), 'no letters');
            assert.ok(!regex.CSS_SIZE_REGEX.test('20px and more'), 'no space');
        });

        it('SINGLE_STRING_REGEX matches', () => {
            assert.ok(regex.SINGLE_STRING_REGEX.test('green'));
            assert.ok(regex.SINGLE_STRING_REGEX.test(eightyChars));
        });
        it('SINGLE_STRING_REGEX does not match', () => {
            assert.ok(!regex.SINGLE_STRING_REGEX.test(' '), 'no space allowed');
            assert.ok(!regex.SINGLE_STRING_REGEX.test('green and more'), 'no space allowed');
            assert.ok(!regex.SINGLE_STRING_REGEX.test('30%'), 'no % allowed');
            assert.ok(!regex.SINGLE_STRING_REGEX.test('foo:'), 'no : allowed');
            assert.ok(!regex.SINGLE_STRING_REGEX.test('foo-bar'), 'no - allowed');
            assert.ok(!regex.SINGLE_STRING_REGEX.test('-20px'), 'no - allowed');
            assert.ok(!regex.SINGLE_STRING_REGEX.test('fö'), 'no non-ASCII characters allowed');
            assert.ok(!regex.SINGLE_STRING_REGEX.test(eightyOneChars), 'string too long');
        });

        it('HEX_REGEX matches', () => {
            assert.ok(regex.HEX_REGEX.test('#1ac'));
            assert.ok(regex.HEX_REGEX.test('#1A2b3c'));
            assert.ok(regex.HEX_REGEX.test('#1a2B3c4d'));
        });
        it('HEX_REGEX does not match', () => {
            assert.ok(!regex.HEX_REGEX.test('1ac'), 'must start with #');
            assert.ok(!regex.HEX_REGEX.test('#1ac and more'), 'no space allowed');
            assert.ok(!regex.HEX_REGEX.test('#30%'), 'no % allowed');
            assert.ok(!regex.HEX_REGEX.test('#foo:'), 'no : allowed');
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
            assert.ok(!regex.RGB_REGEX.test('foo'), 'must start with rgb( or rgba(');
            assert.ok(!regex.RGB_REGEX.test('rgb()'), 'rgb/a needs some arguments');
            assert.ok(!regex.RGB_REGEX.test('rgb(134, 112, 164, 0.611) foo'), 'must end with )');
            assert.ok(!regex.RGB_REGEX.test('rgb(foo:)'), 'no colon inside ()');
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
            assert.ok(!regex.HSL_REGEX.test('foo'), 'must start with hsl( or hsla(');
            assert.ok(!regex.RGB_REGEX.test('hsl()'), 'hsl/a needs some arguments');
            assert.ok(!regex.HSL_REGEX.test('hsl(34, 12, 64, 0.6) foo'), 'must end with )');
            assert.ok(!regex.HSL_REGEX.test('hsl(foo:)'), 'no colon inside ()');
        });
    });
});
