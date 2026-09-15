'use strict';

const assert = require( '../../utils/assert.js' );
const simplifyProtectionObject = require( '../../../lib/mwapi' ).simplifyProtectionObject;

describe( 'lib:mwapi:simplifyProtectionObject', () => {
	it( 'simplifyProtectionObject should simplify', () => {
		const obj = [ { type: 'edit', level: 'boss' } ];

		assert.deepEqual( simplifyProtectionObject( obj ), {
			edit: [ 'boss' ]
		} );
	} );
	it( 'simplifyProtectionObject should remove duplicates', () => {
		const obj = [ { type: 'edit', level: 'boss' }, { type: 'edit', level: 'boss' } ];

		assert.deepEqual( simplifyProtectionObject( obj ), {
			edit: [ 'boss' ]
		} );
	} );
	it( 'simplifyProtectionObject should keep non-duplicates', () => {
		const obj = [
			{ type: 'edit', level: 'boss' },
			{ type: 'edit', level: 'monster' },
			{ type: 'move', level: 'monster' }
		];

		assert.deepEqual( simplifyProtectionObject( obj ), {
			edit: [ 'boss', 'monster' ],
			move: [ 'monster' ]
		} );
	} );
	it( 'simplifyProtectionObject should return empty object for empty list', () => {
		const obj = [];

		assert.deepEqual( simplifyProtectionObject( obj ), {} );
	} );
} );
