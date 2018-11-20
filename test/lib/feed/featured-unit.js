'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const assert = require( '../../utils/assert' );

const featured = require( '../../../lib/feed/featured.js' ); // module under test

function stringFromFixtureFile( fileName ) {
	return fs.readFileSync( path.resolve( __dirname, `fixtures/${fileName}` ), 'utf8' );
}

describe( 'featured-unit', () => {
	it( 'isSupported should return the correct boolean', () => {
		assert.equal( featured.testing.isSupported( 'en.wikipedia.org' ), true );
		assert.equal( featured.testing.isSupported( 'de.wikipedia.org' ), true );
		assert.equal( featured.testing.isSupported( 'zh.wikipedia.org' ), false );
		assert.equal( featured.testing.isSupported( 'en.wikipedia.beta.wmflabs.org' ), false );
	} );

	it( 'findPageTitle should find the first bold link: a inside b', () => {
		const htmlString = stringFromFixtureFile( 'multiple-bold-links.html' );
		assert.equal( featured.testing.findPageTitle( htmlString ), 'Number 1' );
	} );

	it( 'findPageTitle should find the first bold link: b inside a', () => {
		const htmlString = stringFromFixtureFile( 'bold-inside-anchor.html' );
		assert.equal( featured.testing.findPageTitle( htmlString ), 'Number 1' );
	} );

	it( 'findPageTitle should return undefined if nothing found', () => {
		const htmlString = stringFromFixtureFile( 'only-regular-links.html' );
		assert.equal( featured.testing.findPageTitle( htmlString ), undefined );
	} );
} );
