'use strict';

const domino = require( 'domino' );
const preq = require( 'preq' );
const assert = require( '../../utils/assert.js' );
const server = require( '../../utils/server.js' );

describe( 'mobile-compat-html', function () {

	this.timeout( 20000 ); // eslint-disable-line no-invalid-this

	before( () => server.start() );

	const localUri = ( title, domain = 'en.wikipedia.org' ) => {
		return `${server.config.uri}${domain}/v1/page/mobile-compat-html/${title}`;
	};

	it( 'HTML should be sectioned', () => {
		const uri = localUri( 'Foobar/788941783' );
		return preq.get( { uri } )
			.then( ( res ) => {
				const document = domino.createDocument( res.body );
				assert.selectorExistsNTimes( document, 'section', 7, 'should have 7 sections' );
			} );
	} );
} );
