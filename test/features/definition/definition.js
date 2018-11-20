'use strict';

const assert = require( '../../utils/assert.js' );
const preq = require( 'preq' );
const server = require( '../../utils/server.js' );

describe( 'definition', function () {

	this.timeout( 20000 ); // eslint-disable-line no-invalid-this

	before( () => server.start() );

	it( "en 'cat' request should have expected structure and content", () => {
		return preq.get(
			{ uri: `${server.config.uri}en.wiktionary.org/v1/page/definition/cat/42803194` } )
			.then( ( res ) => {
				const en = res.body.en;
				const bodytext = JSON.stringify( res.body );
				assert.ok( bodytext.indexOf( 'ib-brac' ) === -1 );
				assert.ok( bodytext.indexOf( 'ib-content' ) === -1 );
				assert.ok( bodytext.indexOf( 'defdate' ) === -1 );
				assert.deepEqual( res.status, 200 );
				assert.notDeepEqual( en, undefined );
				assert.equal( en.length, 8, JSON.stringify( en, null, 2 ) );
				for ( let i = 0; i < en.length; i++ ) {
					assert.notDeepEqual( en[ i ].partOfSpeech, undefined );
					assert.notDeepEqual( en[ i ].definitions, undefined );
					for ( let j = 0; j < en[ i ].definitions.length; j++ ) {
						assert.notDeepEqual( en[ i ].definitions[ j ].definition, undefined );
						const examples = en[ i ].definitions[ j ].examples;
						if ( examples ) {
							assert.ok( examples.length > 0 );
							for ( const example of examples ) {
								assert.ok( example.trim().length > 0 );
							}
						}
						const parsedExamples = en[ i ].definitions[ j ].parsedExamples;
						if ( parsedExamples ) {
							assert.ok( parsedExamples.length > 0 );
							for ( const parsedExample of parsedExamples ) {
								assert.ok( parsedExample.example.trim().length > 0 );
							}
						}
					}
				}
				assert.deepEqual( en[ 0 ].partOfSpeech, 'Noun' );
				const def0 = en[ 0 ].definitions[ 0 ].definition;
				assert.ok( def0.indexOf( 'An animal of the family ' ) === 0,
					'Expected different start of definition specifying family' );
				assert.deepEqual( en[ 1 ].partOfSpeech, 'Verb' );
				const def1 = en[ 1 ].definitions[ 0 ].definition;
				assert.ok( def1.indexOf( 'To <a href="/wiki/hoist" title="hoist"' ) === 0,
					'Expected different start of definition linking to hoist' );
			} );
	} );

	it( 'missing definitions', () => {
		const uri = `${server.config.uri}en.wiktionary.org/v1/page/definition/Dssjbkrt`;
		return preq.get( { uri } )
			.then( ( res ) => {
				throw new Error( `Expected an error, but got status: ${res.status}` );
			}, ( err ) => {
				assert.status( err, 404 );
			} );
	} );

	it( 'non-term page', () => {
		const uri = `${server.config.uri}en.wiktionary.org/v1/page/definition/Main_page`;
		return preq.get( { uri } )
			.then( ( res ) => {
				throw new Error( `Expected an error, but got status: ${res.status}` );
			}, ( err ) => {
				assert.status( err, 404 );
			} );
	} );

	it( 'unsupported language', () => {
		const uri = `${server.config.uri}ru.wiktionary.org/v1/page/definition/Baba`;
		return preq.get( { uri } )
			.then( ( res ) => {
				throw new Error( `Expected an error, but got status: ${res.status}` );
			}, ( err ) => {
				assert.status( err, 501 );
			} );
	} );

	it( 'non-English term on English Wiktionary returns valid results', () => {
		const uri = `${server.config.uri}en.wiktionary.org/v1/page/definition/%E4%B8%AD%E5%9B%BD`;
		return preq.get( { uri } )
			.then( ( res ) => {
				assert.status( res, 200 );
				assert.ok( Object.keys( res ).length !== 0 );
			} );
	} );

	it( 'translingual term', () => {
		const uri = `${server.config.uri}en.wiktionary.org/v1/page/definition/Toxicodendron`;
		return preq.get( { uri } )
			.then( ( res ) => {
				assert.status( res, 200 );
				assert.ok( Object.keys( res ).length !== 0 );
			} );
	} );
} );
