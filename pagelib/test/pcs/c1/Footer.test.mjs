import assert from 'assert';
import Banana from 'banana-i18n';
import pcs from '../../../build/wikimedia-page-library-pcs.js';

describe( 'pcs.c1.Footer', () => {
	describe( '.getPageLastEditedString() - English plural message has 0 case last (correct order)', () => {
		let banana;

		before( () => {
			banana = new Banana( 'en' );
			// wrong order: {{PLURAL:$1|0=Updated today|1=Updated yesterday|Updated $1 days ago}}
			banana.load( { 'page-last-edited': '{{PLURAL:$1|Updated yesterday|Updated $1 days ago|0=Updated today}}' } );
		} );

		it( 'today', () => {
			assert.strictEqual( pcs.c1.Footer._getPageLastEditedString( banana, 0 ), 'Updated today' );
		} );

		it( 'yesterday', () => {
			assert.strictEqual( pcs.c1.Footer._getPageLastEditedString( banana, 1 ), 'Updated yesterday' );
		} );

		it( '2 days ago', () => {
			assert.strictEqual( pcs.c1.Footer._getPageLastEditedString( banana, 2 ), 'Updated 2 days ago' );
		} );
	} );

	describe( '.getPageLastEditedString() - German plural message has 0 case first (wrong order)', () => {
		let banana;

		before( () => {
			banana = new Banana( 'de' );
			banana.load( { 'page-last-edited': '{{PLURAL:$1|0=Heute|1=Gestern|Vor $1 Tagen}} bearbeitet' } );
		} );

		it( 'today', () => {
			assert.strictEqual( pcs.c1.Footer._getPageLastEditedString( banana, 0 ), 'Heute bearbeitet' );
		} );

		it( 'yesterday', () => {
			assert.strictEqual( pcs.c1.Footer._getPageLastEditedString( banana, 1 ), 'Gestern bearbeitet' );
		} );

		it( '2 days ago', () => {
			assert.strictEqual( pcs.c1.Footer._getPageLastEditedString( banana, 2 ), 'Vor 2 Tagen bearbeitet' );
		} );

		it( '._getArticleTitleFromPathName() does not return urlencoded title', () => {
			let pathname = '/api/rest_v1/page/mobile-html/Phobos_(moon)';
			assert.strictEqual( pcs.c1.Footer._getArticleTitleFromPathName( pathname ), 'Phobos_(moon)' );
			pathname = '/api/rest_v1/page/mobile-html/%D0%92%D0%BE%D0%B9%D0%BD%D0%B0_%D0%B8_%D0%BC%D0%B8%D1%80';
			assert.strictEqual( pcs.c1.Footer._getArticleTitleFromPathName( pathname ), 'Война_и_мир' );
		} );
	} );
} );
