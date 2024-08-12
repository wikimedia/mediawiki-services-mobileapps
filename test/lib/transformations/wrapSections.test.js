'use strict';

const assert = require('../../utils/assert');
const fixtures = require('../../utils/fixtures');
const lib = require('../../../lib/transformations/wrapSections');

describe('lib:wrapSections', () => {
	describe('process output from action=parse (en)', () => {
		const html = fixtures.readFileSync('parse_contents_en.html');

		it('should expand into multiple sections', () => {
			const sections = lib.makeSections(html);
			assert.ok(sections.length === 14);
		});
	});

	describe('process output from action=parse (zh)', () => {
		const html = fixtures.readFileSync('parse_contents_zh.html');

		it('should expand into multiple sections', () => {
			const sections = lib.makeSections(html);
			assert.ok(sections.length === 19);
		});
	});
});
