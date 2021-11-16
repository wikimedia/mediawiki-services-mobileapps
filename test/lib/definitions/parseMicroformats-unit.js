'use strict';

const assert = require('../../utils/assert');
const parseMicroformats = require('../../../lib/definitions/parseMicroformats');

describe('lib:definitions:parseMicroformats', () => {

	it('parses a simple microformat', () => {
		const parsed = parseMicroformats('<div class="h-foo">' +
            '<span class="e-bar"><b>bar</b>Value</span>' +
            '</div>', 'h-foo');
		assert.deepEqual(parsed, [
			{ bar: '<b>bar</b>Value' }
		]);
	});

	it('filters specific formats', () => {
		const parsed = parseMicroformats('<div class="h-foo">' +
            '<span class="e-bar"><b>bar</b>Value</span>' +
            '</div>', 'h-baz');
		assert.deepEqual(parsed, []);
	});
});
