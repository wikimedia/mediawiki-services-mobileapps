'use strict';

const assert = require( '../../utils/assert' );
const random = require( '../../../lib/feed/random' );
const sample = require( './sample-results' );

describe( 'random/title', () => {

	it( 'pickBestResult should select best-scored title from sample', () => {
		const best = random.pickBestResult( sample );
		assert.ok( best.title === 'William Ellis (Medal of Honor)' );
	} );

} );
