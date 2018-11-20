'use strict';

const assert = require( '../../utils/assert' );
const media = require( '../../../lib/media' );
const getStructuredArtistInfo = media.getStructuredArtistInfo;

const imageWithCaption =
    '<figure typeof="mw:Image">' +
        '<img resource="./File:Foo"/ width="100" height="100">' +
        '<figcaption>An <i>example</i> image</figcaption>' +
    '</figure>';

const videoWithMetadata =
    '<figure typeof="mw:Video" data-mw=\'{"starttime": "1", "thumbtime": "2", "endtime": "3"}\'>' +
        '<video resource="./File:Foo"/>' +
    '</figure>';

const videoWithDerivative =
    '<figure typeof="mw:Video">' +
        '<video resource="./File:Foo">' +
            '<source src="https://example.com/Foo.ogv"' +
                   ' type=\'video/ogg; codecs="theora, vorbis"\'' +
                   ' data-title="Foo"' +
                   ' data-shorttitle="Foo"' +
                   ' data-file-width="120"' +
                   ' data-file-height="120"' +
            '/>' +
        '</video>' +
    '</figure>';

const spokenWikipedia =
    '<div id="section_SpokenWikipedia">' +
        '<figure typeof="mw:Audio"><audio resource="./File:Foo"/></figure>' +
    '</div>';

const spokenWikipediaOld =
    '<div id="section_SpokenWikipedia">' +
        '<figure typeof="mw:Audio"><video resource="./File:Foo"/></figure>' +
    '</div>';

const pronunciationAudio =
    '<span class="IPA"></span>' +
    '<small>' +
        '<a rel="mw:MediaLink" title="Foo">Pronunciation</a>' +
    '</small>';

const imageWithSection =
    '<section data-mw-section-id="0">' +
        '<figure typeof="mw:Image">' +
            '<img resource="./File:Foo"/ width="100" height="100">' +
        '</figure>' +
    '</section>';

const imageWithPercentEncodedTitle =
    '<figure typeof="mw:Image">' +
        '<img resource="./File:What%3F.jpg" width="100" height="100">' +
    '</figure>';

const pronunciationWithPercentEncodedTitle =
    '<span class="IPA"></span>' +
    '<small>' +
        '(<span class="unicode haudio">' +
            '<a rel="mw:MediaLink" href="//upload.wikimedia.org/wikipedia/commons/4/48/En-us-' +
            'A.p.j._Abdul_Kalam_from_India_pronunciation_%28Voice_of_America%29.ogg" title=' +
            '"En-us-A.p.j. Abdul Kalam from India pronunciation %28Voice of America%29.ogg">' +
            'listen</a>' +
        '</span>)' +
    '</small>';

describe( 'lib:media metadata is correctly parsed from HTML', () => {

	it( 'all expected captions are present', () => {
		const result = media.getMediaItemInfoFromPage( imageWithCaption )[ 0 ];
		assert.deepEqual( result.caption.html, 'An <i>example</i> image' );
		assert.deepEqual( result.caption.text, 'An example image' );
	} );

	it( 'all expected data-mw properties are present', () => {
		const result = media.getMediaItemInfoFromPage( videoWithMetadata )[ 0 ];
		assert.deepEqual( result.start_time, 1 );
		assert.deepEqual( result.thumb_time, 2 );
		assert.deepEqual( result.end_time, 3 );
	} );

	it( 'all expected derivative properties are present', () => {
		const result = media.getMediaItemInfoFromPage( videoWithDerivative )[ 0 ];
		const derivative = result.sources[ 0 ];
		assert.deepEqual( derivative.url, 'https://example.com/Foo.ogv' );
		assert.deepEqual( derivative.mime, 'video/ogg' );
		assert.deepEqual( derivative.codecs, [ 'theora', 'vorbis' ] );
		assert.deepEqual( derivative.name, 'Foo' );
		assert.deepEqual( derivative.short_name, 'Foo' );
		assert.deepEqual( derivative.width, 120 );
		assert.deepEqual( derivative.height, 120 );
	} );

	it( 'spoken Wikipedia file is correctly identified', () => {
		const result = media.getMediaItemInfoFromPage( spokenWikipedia )[ 0 ];
		assert.deepEqual( result.audio_type, 'spoken' );
	} );

	it( 'spoken Wikipedia (OLD: with video tag) file is correctly identified', () => {
		const result = media.getMediaItemInfoFromPage( spokenWikipediaOld )[ 0 ];
		assert.deepEqual( result.audio_type, 'spoken' );
	} );

	it( 'pronunciation audio file is correctly identified', () => {
		const result = media.getMediaItemInfoFromPage( pronunciationAudio )[ 0 ];
		assert.deepEqual( result.title, 'File:Foo' );
		assert.deepEqual( result.type, 'audio' );
		assert.deepEqual( result.audio_type, 'pronunciation' );
	} );

	it( 'section is correctly identified', () => {
		const result = media.getMediaItemInfoFromPage( imageWithSection )[ 0 ];
		assert.deepEqual( result.section_id, 0 );
	} );

	it( 'titles are decoded after parsing from HTML', () => {
		const result = media.getMediaItemInfoFromPage( imageWithPercentEncodedTitle )[ 0 ];
		assert.deepEqual( result.title, 'File:What?.jpg' );
	} );

	it( 'pronunciation titles are decoded after parsing from HTML', () => {
		const result = media.getMediaItemInfoFromPage( pronunciationWithPercentEncodedTitle )[ 0 ];
		// eslint-disable-next-line max-len
		assert.deepEqual( result.title, 'File:En-us-A.p.j. Abdul Kalam from India pronunciation (Voice of America).ogg' );
	} );
} );

describe( 'lib:media parse structured artist info', () => {
	const req = ( domain = 'en.wikipedia.org' ) => ( { params: { domain } } );

	it( 'all info is parsed from common HTML structure', () => {
		const html = '<a href="//commons.wikimedia.org/wiki/User:Foo" title="User:Foo">Foo</a>';
		const result = getStructuredArtistInfo( req(), html );
		assert.deepEqual( result.html, html );
		assert.deepEqual( result.name, 'Foo' );
		assert.deepEqual( result.user_page, 'https://commons.wikimedia.org/wiki/User:Foo' );
	} );

	it( "'html' and 'name' fields are returned from plain text input", () => {
		const html = 'Foo';
		const result = getStructuredArtistInfo( req(), html );
		assert.deepEqual( result.html, html );
		assert.deepEqual( result.name, html );
		assert.deepEqual( result.user_page, undefined );
	} );

	it( 'only html returned for site other than Commons', () => {
		const html = '<a href="//example.com/wiki/User:Foo" title="User:Foo">Foo</a>';
		const result = getStructuredArtistInfo( req(), html );
		assert.deepEqual( result.html, html );
		assert.deepEqual( result.name, undefined );
		assert.deepEqual( result.user_page, undefined );
	} );

	it( 'only html returned if additional text is present', () => {
		const html = '<a href="//commons.wikimedia.org/wiki/User:Foo" title="User:Foo">Foo</a>, ' +
            'Jimbo Wales';
		const result = getStructuredArtistInfo( req(), html );
		assert.deepEqual( result.html, html );
		assert.deepEqual( result.name, undefined );
		assert.deepEqual( result.user_page, undefined );
	} );

	it( 'only html returned if non-namespace portion of the title !== html.textContent', () => {
		const html = '<a href="//commons.wikimedia.org/wiki/User:Foo" title="User:Foo">Bar</a>';
		const result = getStructuredArtistInfo( req(), html );
		assert.deepEqual( result.html, html );
		assert.deepEqual( result.name, undefined );
		assert.deepEqual( result.user_page, undefined );
	} );

	it( 'parses html with lang from metadata object', () => {
		const obj = { en: 'Foo', de: 'Bar' };
		const result = getStructuredArtistInfo( req(), obj );
		assert.deepEqual( result.html, obj.en );
		assert.deepEqual( result.name, 'Foo' );
		assert.deepEqual( result.lang, 'en' );
		assert.deepEqual( result.user_page, undefined );
	} );

	it( 'parses html with lang (non-English) from metadata object', () => {
		const obj = { en: 'Foo', de: 'Bar' };
		const result = getStructuredArtistInfo( req( 'de.wikipedia.org' ), obj );
		assert.deepEqual( result.html, obj.de );
		assert.deepEqual( result.name, 'Bar' );
		assert.deepEqual( result.lang, 'de' );
		assert.deepEqual( result.user_page, undefined );
	} );

	it( 'undefined result if input is an empty string', () => {
		const result = getStructuredArtistInfo( req(), '' );
		assert.deepEqual( result, undefined );
	} );
} );
