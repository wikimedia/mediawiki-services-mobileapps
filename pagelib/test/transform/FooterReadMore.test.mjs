import assert from 'assert';
import pagelib from '../../build/wikimedia-page-library-transform.js';
import domino from 'domino';

describe( 'FooterReadMore', () => {
	describe( 'safelyRemoveEnclosures()', () => {
		const safelyRemoveEnclosures = pagelib.FooterReadMore.test.safelyRemoveEnclosures;
		it( 'should remove forward slash enclosures', () => {
			assert.ok( safelyRemoveEnclosures( 'abc/123/def a/b/c', '/', '/' ) === 'abcdef ac' );
		} );

		it( 'should remove parenthetical enclosures', () => {
			assert.ok( safelyRemoveEnclosures( 'abc(123)def a(b)c', '(', ')' ) === 'abcdef ac' );
		} );

		it( 'should coalesce spaces on either side of enclosure', () => {
			assert.ok( safelyRemoveEnclosures( 'abc (123) def a(b)c', '(', ')' ) === 'abc def ac' );
		} );
	} );
	describe( 'cleanExtract()', () => {
		const cleanExtract = pagelib.FooterReadMore.test.cleanExtract;
		it( 'should clean complex extract', () => {
			const input =
      'Lutefisk (Norwegian) or lutfisk (Swedish) (pronounced [lʉːtfesk] in Northern and Central ' +
      'Norway, [lʉːtəfisk] in Southern Norway, [lʉːtfɪsk] in Sweden and in Finland (Finnish: ' +
      'lipeäkala)) is a traditional dish of some Nordic countries.';
			const expectation =
      'Lutefisk or lutfisk is a traditional dish of some Nordic countries.';
			assert.ok( cleanExtract( input ) === expectation );
		} );
	} );
	describe( 'escapedContent', () => {
		const document = domino.createDocument( '<h2 id="id"></h2>' );
		pagelib.FooterReadMore.setHeading( '<span id="hello">&amp;</span>', 'id', document );
		const element = document.getElementById( 'id' );
		assert.equal( element.innerHTML, '&lt;span id="hello"&gt;&amp;amp;&lt;/span&gt;' );
		// Quotes aren't OK on attributes
		assert.equal( element.title, '&lt;span id=&quot;hello&quot;&gt;&amp;amp;&lt;/span&gt;' );
	} );

	describe( '.showReadMorePages()', () => {
		const text = `
      <html>
        <body>
          <section id="pcs-footer-container-readmore">
            <div id="pcs-footer-container-readmore-pages"></div>
          </section>
        </body>
      </html>
    `;
		const document = domino.createDocument( text );
		const res = [
			{
				pageid: 52999,
				ns: 0,
				title: 'Phobos (moon)',
				index: 2,
				thumbnail: {
					source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Phobos_colour_2008.jpg/160px-Phobos_colour_2008.jpg',
					width: 160,
					height: 151
				},
				description: 'Largest and innermost moon of Mars',
				descriptionsource: 'local',
				contentmodel: 'wikitext',
				pagelanguage: 'en',
				pagelanguagehtmlcode: 'en',
				pagelanguagedir: 'ltr',
				touched: '2024-11-12T17:45:44Z',
				lastrevid: 1254994398,
				length: 73802,
				varianttitles: {
					en: 'Phobos (moon)'
				}
			},
			{
				pageid: 988372,
				ns: 0,
				title: 'Far side of the Moon',
				index: 1,
				thumbnail: {
					source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Far_side_of_the_Moon.png/160px-Far_side_of_the_Moon.png',
					width: 160,
					height: 160
				},
				description: 'Hemisphere of the Moon that always faces away from Earth',
				descriptionsource: 'local',
				contentmodel: 'wikitext',
				pagelanguage: 'en',
				pagelanguagehtmlcode: 'en',
				pagelanguagedir: 'ltr',
				touched: '2024-11-19T20:27:40Z',
				lastrevid: 1256903522,
				length: 40255,
				varianttitles: {
					en: 'Far side of the Moon'
				}
			},
			{
				pageid: 1580280,
				ns: 0,
				title: 'Lunar water',
				index: 3,
				thumbnail: {
					source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Markov_1980_fig3.png/160px-Markov_1980_fig3.png',
					width: 160,
					height: 154
				},
				description: 'Presence of water on the Moon',
				descriptionsource: 'local',
				contentmodel: 'wikitext',
				pagelanguage: 'en',
				pagelanguagehtmlcode: 'en',
				pagelanguagedir: 'ltr',
				touched: '2024-11-19T20:28:07Z',
				lastrevid: 1247982366,
				length: 60127,
				varianttitles: {
					en: 'Lunar water'
				}
			}
		];
		assert.equal( document.getElementsByClassName( 'pcs-footer-readmore-page' ).length, 0 );
		pagelib.FooterReadMore.test.showReadMorePages(
			res,
			'pcs-footer-container-readmore',
			'pcs-footer-container-readmore-pages',
			'en',
			document
		);
		assert.equal( document.getElementsByClassName( 'pcs-footer-readmore-page' ).length, 3 );
	} );
} );
