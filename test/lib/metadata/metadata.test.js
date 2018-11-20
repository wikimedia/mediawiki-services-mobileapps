'use strict';

const lib = require( '../../../lib/metadata' ).testing;
const assert = require( '../../utils/assert' );

describe( 'lib:metadata', () => {

	it( 'augmentLangLinks handles undefined langlinks', () => {
		assert.doesNotThrow( () => lib.augmentLangLinks() );
	} );

	it( 'augmentCategores handles undefined categories', () => {
		assert.doesNotThrow( () => lib.augmentCategories() );
	} );

} );
