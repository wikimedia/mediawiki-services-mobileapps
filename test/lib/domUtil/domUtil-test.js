'use strict';

const assert = require( '../../utils/assert' );
const testUtil = require( '../../utils/testUtil' );
const lib = require( '../../../lib/domUtil' );

describe( 'lib:domUtil', () => {
	it( 'isRTL should return false for LTR doc', () => {
		const document = testUtil.readTestFixtureDoc( 'Dog.html' );
		const firstSectionElement = document.querySelector( 'section' );
		assert.ok( !lib.isRTL( firstSectionElement ) );
	} );

	it( 'isRTL should return true for RTL doc', () => {
		const document = testUtil.readTestFixtureDoc( 'ar-Mathematics.html' );
		const firstSectionElement = document.querySelector( 'section' );
		assert.ok( lib.isRTL( firstSectionElement ) );
	} );
} );
