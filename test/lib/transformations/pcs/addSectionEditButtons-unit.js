'use strict';

const assert = require( '../../../utils/assert.js' );
const lib = require( '../../../../lib/transformations/pcs/addSectionEditButtons' );
const testUtil = require( '../../../utils/testUtil' );

describe( 'lib:addSectionEditButtons', () => {
	it( 'addSectionEditButtons should restructure section headings', () => {
		const document = testUtil.readTestFixtureDoc( 'Dog.html' );
		assert.selectorExistsNTimes( document, '.pagelib_edit_section_header', 0, 'pre transform' );
		assert.selectorExistsNTimes( document, '.pagelib_edit_section_link_container', 0, 'pre 2' );
		assert.selectorExistsNTimes( document, '.pagelib_edit_section_link', 0, 'pre tx 3' );

		lib.addSectionEditButtons( document, 'Dog' );

		assert.selectorExistsNTimes( document, '.pagelib_edit_section_header', 46, 'post transform' );
		assert.selectorExistsNTimes( document, '.pagelib_edit_section_link_container', 47, 'post 2' );
		assert.selectorExistsNTimes( document, '.pagelib_edit_section_link', 47, 'post tx 3' );
		assert.deepEqual( document.querySelector( '.pagelib_edit_section_link' ).href,
			'/w/index.php?title=Dog&action=edit&section=0', 'post tx 4: first edit link' );
	} );
} );
