import assert from 'assert';
import pcs from '../../../build/wikimedia-page-library-pcs.js';

const c1 = pcs.c1;
const Themes = c1.Themes;

describe( 'pcs.c1.Themes', () => {
	it( 'presence', () => {
		assert.ok( Themes.DEFAULT );
		assert.ok( Themes.DARK );
		assert.ok( Themes.BLACK );
		assert.ok( Themes.SEPIA );
	} );
} );
