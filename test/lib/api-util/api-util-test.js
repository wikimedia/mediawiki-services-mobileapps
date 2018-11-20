'use strict';

const BBPromise = require( 'bluebird' );
const assert = require( '../../utils/assert' );
const mwapi = require( '../../../lib/mwapi' );
const api = require( '../../../lib/api-util' ).test;

const logger = require( 'bunyan' ).createLogger( {
	name: 'test-logger',
	level: 'warn'
} );

logger.log = function ( a, b ) {};

describe( 'lib:apiUtil', () => {

	it( 'checkForQueryPagesInResponse should return 504 when query.pages are absent', () => {
		return new Promise( ( resolve ) => {
			return resolve( {} );
		} ).then( ( response ) => {
			assert.throws( () => {
				mwapi.checkForQueryPagesInResponse( { logger }, response );
			}, /api_error/ );
		} );
	} );

	it( 'batching works correctly', () => {
		const batches = api._batch( [ 0, 1, 2, 3, 4 ], 2 );
		assert.deepEqual( batches.length, 3 );
		assert.deepEqual( batches[ 0 ].length, 2 );
		assert.deepEqual( batches[ 1 ].length, 2 );
		assert.deepEqual( batches[ 2 ].length, 1 );
	} );

	it( 'order is preserved when Array.reduce is called on resolved BBPromise.all batches', () => {
		const batches = api._batch( [ 0, 1, 2, 3, 4 ], 2 );
		const promises = BBPromise.all( batches.map( ( batch ) => {
			return new BBPromise( ( resolve ) => setTimeout(
				() => resolve( batch ),
				batch.length * 10 )
			);
		} ) );
		promises.then( ( response ) => {
			const result = response.reduce( ( arr, batch ) => arr.concat( batch ), [] );
			assert.deepEqual( result[ 0 ], 0 );
			assert.deepEqual( result[ 1 ], 1 );
			assert.deepEqual( result[ 2 ], 2 );
			assert.deepEqual( result[ 3 ], 3 );
			assert.deepEqual( result[ 4 ], 4 );
		} );
	} );
} );
