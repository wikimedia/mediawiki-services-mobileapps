'use strict';

const assert = require('../../utils/assert');
const axios = require('axios');
const fixtures = require('../../utils/fixtures');
const lib = require('../../../lib/transformations/wrapSections');

describe('lib:wrapSections', () => {
	it('should expand into multiple sections when action=parse (en)', () => {
		const baseURL = 'https://en.wikipedia.org/w/api.php';
		const query = 'action=parse&page=User%3AJGiannelos_(WMF)%2Ftest-sections&format=json';
		const url = `${ baseURL }?${ query }`;
		return axios.get(url).then((response) => {
			const html = response.data.parse.text['*'];
			const sections = lib.makeSections(html);
			assert.equal(sections.length, 5);
		});
	});

	it('should expand into multiple sections when action=parse (zh)', () => {
		const baseURL = 'https://zh.wikipedia.org/w/api.php';
		const query = 'action=parse&page=User%3AJGiannelos_(WMF)%2Ftest-sections&format=json';
		const url = `${ baseURL }?${ query }`;
		return axios.get(url).then((response) => {
			const html = response.data.parse.text['*'];
			const sections = lib.makeSections(html);
			assert.equal(sections.length, 5);
		});
	});
});
