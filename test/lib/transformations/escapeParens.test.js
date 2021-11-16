'use strict';

const assert = require('./../../utils/assert');
const escape = require('./../../../lib/transformations/escapeParens');

describe('lib:escape + unescape parentheses', () => {
	describe('Latin parentheses escaping', () => {
		const LATIN_PARENS = 'ab(cd)ef';
		const LATIN_PARENS_ESCAPED = 'ab\uf001cd\uf002ef';

		it('properly escapes Latin parentheses', () => {
			assert.deepEqual(escape.escape(LATIN_PARENS), LATIN_PARENS_ESCAPED);
		});
		it('properly unescapes Latin parentheses', () => {
			assert.deepEqual(escape.unescape(LATIN_PARENS_ESCAPED), LATIN_PARENS);
		});
	});

	describe('Non-Latin parentheses escaping', () => {
		const NON_LATIN_PARENS = 'ab（cd）ef';
		const NON_LATIN_PARENS_ESCAPED = 'ab\uf003cd\uf004ef';

		it('properly escapes non-Latin parentheses', () => {
			assert.deepEqual(escape.escape(NON_LATIN_PARENS), NON_LATIN_PARENS_ESCAPED);
		});
		it('properly unescapes non-Latin parentheses', () => {
			assert.deepEqual(escape.unescape(NON_LATIN_PARENS_ESCAPED), NON_LATIN_PARENS);
		});
	});
});
