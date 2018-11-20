'use strict';

const assert = require( '../../utils/assert' );
const buildTocEntries = require( '../../../lib/metadata' ).testing.buildTocEntries;

const sections = [
	{ id: 0 },
	{ id: 1, toclevel: 1, line: 'Foo', anchor: 'Foo' },
	{ id: 2, toclevel: 2, line: 'Foo', anchor: 'Foo' },
	{ id: -1 },
	{ id: 3, toclevel: 3, line: 'Foo', anchor: 'Foo' },
	{ id: 4, toclevel: 2, line: 'Foo', anchor: 'Foo' },
	{ id: -2 },
	{ id: 5, toclevel: 3, line: 'Foo', anchor: 'Foo' },
	{ id: 6, toclevel: 2, line: 'Foo', anchor: 'Foo' },
	{ id: 7, toclevel: 1, line: 'Foo', anchor: 'Foo' }
];

const deepSections = [
	{ id: 0 },
	{ id: 1, toclevel: 1, line: 'Foo', anchor: 'Foo' },
	{ id: 2, toclevel: 2, line: 'Foo', anchor: 'Foo' },
	{ id: 3, toclevel: 3, line: 'Foo', anchor: 'Foo' },
	{ id: 4, toclevel: 4, line: 'Foo', anchor: 'Foo' },
	{ id: 5, toclevel: 5, line: 'Foo', anchor: 'Foo' },
	{ id: 6, toclevel: 6, line: 'Foo', anchor: 'Foo' },
	{ id: 7, toclevel: 7, line: 'Foo', anchor: 'Foo' },
	{ id: 8, toclevel: 8, line: 'Foo', anchor: 'Foo' },
	{ id: 9, toclevel: 9, line: 'Foo', anchor: 'Foo' },
	{ id: 10, toclevel: 10, line: 'Foo', anchor: 'Foo' }
];

describe( 'lib:metadata buildTableOfContents', () => {
	it( 'should exclude lead section and non-displayable or pseudo-sections', () => {
		const result = buildTocEntries( sections, {} );
		assert.deepEqual( result.length, 7, 'result should have 7 entries (3 excluded)' );
	} );

	it( 'should exclude lead section and (by default) sections with toclevel >= 10', () => {
		const result = buildTocEntries( deepSections, {} );
		assert.deepEqual( result.length, 9, 'result should have 9 entries (2 excluded)' );
	} );

	it( 'toc numbers should reflect the toc level hierarchy', () => {
		const expected = [ '1', '1.1', '1.1.1', '1.2', '1.2.1', '1.3', '2' ];
		const result = buildTocEntries( sections, {} ).map( ( i ) => i.number );
		assert.deepEqual( result.length, expected.length );
		for ( let i = 0; i < expected.length; i++ ) {
			assert.deepEqual( result[ i ], expected[ i ] );
		}
	} );
} );
