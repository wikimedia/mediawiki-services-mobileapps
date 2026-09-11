// Most of this source, excluding the mobile-specific Mathjax configuration,
// is pulled from mediawiki/extensions/Math/modules/ext.math.mathjax.js
function remapChars( v1, v2, base, map, font ) {
	const c1 = v1.chars;
	const c2 = v2.chars;
	for ( let i = 0; i < 26; i++ ) {
		const data1 = c1[ map[ i ] || base + i ] || [];
		const data2 = c2[ 0x41 + i ];
		if ( data1.length === 0 ) {
			c1[ base + i ] = data1;
		}
		for ( const j of [ 0, 1, 2 ] ) {
			data1[ j ] = data2[ j ];
		}
		data1[ 3 ] = Object.assign( {}, data2[ 3 ], {
			f: font,
			c: String.fromCharCode( 0x41 + i )
		} );
	}
}

/** MathJax configuration */
MathJax = {
	options: {
		enableMenu: false,
		enableExplorerHelp: false,
	},
	loader: {
		load: [
			'input/mml',
			'output/svg'
		],
		paths: {
			fonts: '{{baseuri}}data/javascript/mobile/mathjax/fonts',
			mathjax: '{{baseuri}}data/javascript/mobile/mathjax'
		}
	},
	startup: {
		// See https://phabricator.wikimedia.org/T375932 and the suggested fix from
		// https://github.com/mathjax/MathJax/issues/3292#issuecomment-3487698042
		// Makes rendering of \matcal look similar to the browsers MathML rendering
		// and the old image rendering.
		// Note that \mathsrc (which is unsupported by texvc) would map to the
		// same unicode chars and thus should not be activated.
		// This comes directly from the Math extension implementation in ext.math.mathjax.
		async pageReady() {
			const font = window.MathJax.startup.document.outputJax.font;
			Object.assign( font, {
				fontLoadDynamicFile: font.loadDynamicFile,
				async loadDynamicFile( dynamic ) {
					await this.fontLoadDynamicFile( dynamic );
					if ( dynamic.file === 'script' ) {
						await this.fontLoadDynamicFile( this.constructor.dynamicFiles.calligraphic );
						const variant = font.variant;
						const map = { 1: 0x212C, 4: 0x2130, 5: 0x2131, 7: 0x210B, 8: 0x2110, 11: 0x2112, 12: 0x2133, 17: 0x211B };
						remapChars( variant.normal, variant[ '-tex-calligraphic' ], 0x1D49C, map, 'C' );
						remapChars( variant.normal, variant[ '-tex-bold-calligraphic' ], 0x1D4D0, {}, 'CB' );
					}
				}
			} );
			await window.MathJax.startup.defaultPageReady();

		}
	}
};
