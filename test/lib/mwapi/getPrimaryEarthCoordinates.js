'use strict';

const assert = require( '../../utils/assert.js' );
const getPrimaryEarthCoordinates = require( '../../../lib/mwapi' ).getPrimaryEarthCoordinates;

const test = ( coords, expected ) => {
	const result = getPrimaryEarthCoordinates( coords );
	if ( result ) {
		assert.deepEqual( result.latitude, expected.latitude );
		assert.deepEqual( result.longitude, expected.longitude );
	} else {
		assert.deepEqual( result, expected );
	}
};

describe( 'lib:mwapi:getPrimaryEarthCoordinates', () => {
	it( 'gets primary earth coordinates (single coordinate input)', () => {
		test( [ { lat: 0, lon: 0, primary: true, globe: 'earth' } ], { latitude: 0, longitude: 0 } );
	} );

	it( 'gets primary earth coordinates (multiple coordinate input)', () => {
		test( [
			{ lat: 0, lon: 0, primary: false, globe: 'earth' },
			{ lat: 1, lon: 1, primary: true, globe: 'earth' }
		],
		{ latitude: 1, longitude: 1 } );
	} );

	it( 'secondary coordinates are ignored', () => {
		test( [ { lat: 0, lon: 0, primary: false, globe: 'earth' } ], undefined );
	} );

	it( 'non-earth coordinates are ignored', () => {
		test( [ { lat: 0, lon: 0, primary: true, globe: 'moon' } ], undefined );
	} );
} );
