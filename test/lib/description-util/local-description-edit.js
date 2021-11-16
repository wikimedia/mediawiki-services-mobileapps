'use strict';

const descriptionUtil = require('../../../lib/description-util');
const assert = require('../../utils/assert');

describe('Local description template editing', () => {

	const NEW_DESCRIPTION = 'replacement!';

	const tests = [
		{
			name: 'Simple param, only template',
			wikitext: '{{Short description|test}}',
			expected_replaced: `{{Short description|${NEW_DESCRIPTION}}}`,
			expected_deleted: ''
		},
		{
			name: 'Simple param, in the beginning',
			wikitext: '{{Short description|test}}\n==Section 1==\n{{Other template|a|b}}',
			expected_replaced: `{{Short description|${NEW_DESCRIPTION}}}\n==Section 1==\n{{Other template|a|b}}`,
			expected_deleted: '\n==Section 1==\n{{Other template|a|b}}'
		},
		{
			name: 'Simple param, in the middle',
			wikitext: '==Section 1==\n{{Short description|test}}\n{{Other template|a|b}}',
			expected_replaced: `==Section 1==\n{{Short description|${NEW_DESCRIPTION}}}\n{{Other template|a|b}}`,
			expected_deleted: '==Section 1==\n\n{{Other template|a|b}}'
		},
		{
			name: 'Named param',
			wikitext: '==Section 1==\n{{Short description|1=test}}\n{{Other template|a|b}}',
			expected_replaced: `==Section 1==\n{{Short description|1=${NEW_DESCRIPTION}}}\n{{Other template|a|b}}`,
			expected_deleted: '==Section 1==\n\n{{Other template|a|b}}'
		},
		{
			name: 'Unnamed param, multiple params, unnamed',
			wikitext: '==Section 1==\n{{Short description|test|nowiki}}\n{{Other template|a|b}}',
			expected_replaced: `==Section 1==\n{{Short description|${NEW_DESCRIPTION}|nowiki}}\n{{Other template|a|b}}`,
			expected_deleted: '==Section 1==\n\n{{Other template|a|b}}'
		},
		{
			name: 'Unnamed param, multiple params, named',
			wikitext: '==Section 1==\n{{Short description|test|2=nowiki}}\n{{Other template|a|b}}',
			expected_replaced: `==Section 1==\n{{Short description|${NEW_DESCRIPTION}|2=nowiki}}\n{{Other template|a|b}}`,
			expected_deleted: '==Section 1==\n\n{{Other template|a|b}}'
		},
		{
			name: 'named param, multiple params, unnamed',
			wikitext: '==Section 1==\n{{Short description|1=test|nowiki}}\n{{Other template|a|b}}',
			expected_replaced: `==Section 1==\n{{Short description|1=${NEW_DESCRIPTION}|nowiki}}\n{{Other template|a|b}}`,
			expected_deleted: '==Section 1==\n\n{{Other template|a|b}}'
		},
		{
			name: 'named param, multiple params, named',
			wikitext: '==Section 1==\n{{Short description|1=test|2=nowiki}}\n{{Other template|a|b}}',
			expected_replaced: `==Section 1==\n{{Short description|1=${NEW_DESCRIPTION}|2=nowiki}}\n{{Other template|a|b}}`,
			expected_deleted: '==Section 1==\n\n{{Other template|a|b}}'
		}
	];

	tests.forEach((test) => {
		it(test.name, () => {
			assert.deepEqual(true, descriptionUtil.containsLocalDescription(test.wikitext));
			assert.deepEqual(
				test.expected_replaced,
				descriptionUtil.replaceLocalDescription(test.wikitext, NEW_DESCRIPTION)
			);
			assert.deepEqual(
				test.expected_deleted,
				descriptionUtil.deleteLocalDescription(test.wikitext)
			);
		});
	});

	it('Empty wikitext', () => {
		assert.deepEqual(
			false,
			descriptionUtil.containsLocalDescription('')
		);
	});

	it('Respects lowercase', () => {
		assert.deepEqual(
			false,
			descriptionUtil.containsLocalDescription('{{Short Description|test}}')
		);
	});

	it('no template', () => {
		assert.deepEqual(
			false,
			descriptionUtil.containsLocalDescription('==Section 1==\n\n{{Other template|a|b}}')
		);
	});
});
