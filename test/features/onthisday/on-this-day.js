'use strict';

const server = require( '../../utils/server.js' );
const assert = require( '../../utils/assert.js' );
const preq = require( 'preq' );

const eventTypes = [
	'all',
	'selected',
	'births',
	'deaths',
	'events',
	'holidays'
];

// LIVE TEST ENDPOINT INTERNALS PRODUCE AT LEAST SOME RESULTS FOR A GIVEN DAY.
// DO NOT TEST FOR EXACT RESULT COUNT - THESE CHANGE AS PAGES ARE EDITED.
// INSTEAD TEST THAT AT LEAST SOME RESULTS ARE RETURNED.
describe( 'onthisday', function () {
	this.timeout( 20000 ); // eslint-disable-line no-invalid-this

	before( () => server.start() );

	function january30uriForEndpointName( endpointName, lang = 'en' ) {
		return `${server.config.uri}${lang}.wikipedia.org/v1/feed/onthisday/${endpointName}/01/30/`;
	}

	function getJanuary30ResponseForEndpointName( endpointName, lang ) {
		return preq.get( january30uriForEndpointName( endpointName, lang ) );
	}

	function verifyNonZeroEndpointResults( response, endpointName ) {
		assert.deepEqual( response.status, 200 );
		assert.ok( response.body[ endpointName ].length > 0,
			`${endpointName} should have fetched some results` );
	}

	function fetchAndVerifyNonZeroResultsForEndpointName( endpointName, lang ) {
		return getJanuary30ResponseForEndpointName( endpointName, lang )
			.then( ( response ) => {
				verifyNonZeroEndpointResults( response, endpointName );
			} );
	}

	for ( const type of eventTypes ) {
		it( `${type}: unsupported language throws 501`, () => {
			return getJanuary30ResponseForEndpointName( type, 'nl' )
				.catch( ( error ) => {
					assert.equal( error.status, 501 );
				} );
		} );

		if ( type !== 'all' ) {
			it( `${type}: fetches some results`, () => {
				return fetchAndVerifyNonZeroResultsForEndpointName( type );
			} );
		}
	}

	it( '"all" fetches some results for births, deaths, events, holidays and selected', () => {
		return getJanuary30ResponseForEndpointName( 'all' )
			.then( ( response ) => {
				assert.ok( response.body.births.length > 0, 'ALL should return some births' );
				assert.ok( response.body.deaths.length > 0, 'ALL should return some deaths' );
				assert.ok( response.body.events.length > 0, 'ALL should return some events' );
				assert.ok( response.body.holidays.length > 0, 'ALL should return some holidays' );
				assert.ok( response.body.selected.length > 0, 'ALL should return some selected' );
			} );
	} );
} );
