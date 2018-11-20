'use strict';

const domino = require( 'domino' );
const fs = require( 'fs' );
const path = require( 'path' );
const assert = require( '../../../utils/assert.js' );
const widenImages = require( '../../../../lib/transformations/pcs/widenImages' );

const FIXTURES = 'test/fixtures/';

describe( 'lib:widenImages', () => {

	/**
     * @param {!string} fileName name of the fixture file to load
     * @return {!Document}
     */
	const readTestDoc = ( fileName ) => {
		const html = fs.readFileSync( path.resolve( FIXTURES, fileName ) );
		return domino.createDocument( html );
	};

	it( 'widenImages should add a pagelib class to the appropriate figures ', () => {
		const document = readTestDoc( 'Dog.html' );
		assert.selectorExistsNTimes( document, '.pagelib_widen_image_override', 0, 'pre transform' );
		widenImages( document );
		assert.selectorExistsNTimes( document, '.pagelib_widen_image_override', 20,
			'post transform' );
	} );
} );
