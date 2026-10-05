import assert from 'assert';
import domino from 'domino';
import pcs from '../../../build/wikimedia-page-library-pcs.js';
import transform from '../../../build/wikimedia-page-library-transform.js';

const Highlight = pcs.c1.Highlight;
const jump = Highlight.jumpToHighlightOrSection;
const { CollapseTable, SectionUtilities } = transform;

const html = `<div id="pcs">
  <section data-mw-section-id="0">
    <p id="lead-p">Caf\u00e9 \ufb01sh \uff21, \u039b\u039f\u0393\u039f\u03a3 and soft\u00adhyphen.</p>
  </section>
  <section data-mw-section-id="1">
    <div class="pcs-edit-section-header"><h2 id="History">History</h2></div>
    <p id="history-p">The city was <a href="./Founding">founded</a> in <b>1850</b> by settlers.<sup class="reference"><a href="#cite_note-1">[1]</a></sup> It grew \u201cquickly\u201d afterwards.</p>
  </section>
  <section data-mw-section-id="2">
    <div class="pcs-edit-section-header"><h2 id="Natural_history">Natural history</h2></div>
    <p id="nature-p">The city was founded on a river.</p>
    <table class="infobox"><tbody><tr><th>Population</th><td id="population">12,000 in 1900</td></tr></tbody></table>
  </section>
</div>`;

const rect = ( top, height ) => ( {
	top, bottom: top + height, left: 10, right: 110, width: 100, height, x: 10, y: top
} );

/** @return {!Array<string>} the text of each <mark>, in document order */
const markTexts = () =>
	Array.from( document.querySelectorAll( 'mark.pcs-highlight' ), ( mark ) => mark.textContent );

/**
 * Collapses the infobox like mobile-html does: CollapseTable.collapseTables() minus the
 * section-toggled CustomEvent its click handler fires, which domino can't create.
 *
 * @return {void}
 */
const collapseTables = () => {
	CollapseTable.prepareTables( document, 'City', 'Quick facts', 'More', 'Close' );
	const header = document.querySelector( `.${ CollapseTable.CLASS.COLLAPSED_CONTAINER }` );
	header.onclick = () => CollapseTable.toggleCollapseClickCallback.call( header );
};

const originalWindow = global.window;
const originalDocument = global.document;

/**
 * Loads the page into the global window and document, and stubs the layout APIs domino lacks.
 *
 * @param {?Object} options highlightAPI: expose a stub CSS Custom Highlight API
 * @return {void}
 */
const setUp = ( options ) => {
	const window = domino.createWindow( html );
	const document = window.document;
	window.ranges = [];
	document.createRange = () => {
		const range = {
			setStart( node, offset ) {
				range.startContainer = node;
				range.startOffset = offset;
			},
			setEnd( node, offset ) {
				range.endContainer = node;
				range.endOffset = offset;
			},
			getBoundingClientRect: () => rect( 500, 20 )
		};
		window.ranges.push( range );
		return range;
	};
	Array.from( document.querySelectorAll( 'h2' ) ).forEach( ( heading ) => {
		heading.getBoundingClientRect = () => rect( 300, 30 );
	} );
	window.pageYOffset = 1000;
	window.innerHeight = 800;
	window.scrollTo = ( x, y ) => {
		window.pageYOffset = y;
	};
	if ( options && options.highlightAPI ) {
		window.CSS = { highlights: new Map() };
		window.Highlight = function ( range ) {
			this.range = range;
		};
	}
	global.window = window;
	global.document = document;
};

describe( 'pcs.c1.Highlight', () => {
	after( () => {
		global.window = originalWindow;
		global.document = originalDocument;
	} );

	describe( '.jumpToHighlightOrSection()', () => {
		describe( 'matching', () => {
			it( 'matches across inline elements', () => {
				setUp();
				jump( 'city was founded in 1850 by', 'History' );
				assert.deepStrictEqual( markTexts(), [ 'city was ', 'founded', ' in ', '1850', ' by' ] );
				assert.strictEqual( document.getElementById( 'history-p' ).textContent.indexOf( 'The city was founded in 1850 by' ), 0 );
			} );

			it( 'ignores case and whitespace differences', () => {
				setUp();
				jump( 'CITY   WAS', 'History' );
				assert.deepStrictEqual( markTexts(), [ 'city was' ] );
			} );

			it( 'skips references', () => {
				setUp();
				jump( 'by settlers. It grew', 'History' );
				assert.deepStrictEqual( markTexts(), [ 'by settlers.', ' It grew' ] );
				assert.strictEqual( document.querySelectorAll( 'sup mark' ).length, 0 );
			} );

			it( 'matches straight quotes against curly quotes', () => {
				setUp();
				jump( 'grew "quickly"', 'History' );
				assert.deepStrictEqual( markTexts(), [ 'grew \u201cquickly\u201d' ] );
			} );

			it( 'ignores Unicode normalization differences', () => {
				setUp();
				// combining accent vs precomposed, 'fi' vs ligature, 'a' vs fullwidth 'A'
				jump( 'cafe\u0301 fish a', null );
				assert.deepStrictEqual( markTexts(), [ 'Caf\u00e9 \ufb01sh \uff21' ] );
			} );

			it( 'matches a final sigma against an uppercase sigma', () => {
				setUp();
				jump( '\u03bb\u03bf\u03b3\u03bf\u03c2', null );
				assert.deepStrictEqual( markTexts(), [ '\u039b\u039f\u0393\u039f\u03a3' ] );
			} );

			it( 'ignores invisible characters', () => {
				setUp();
				jump( 'softhyphen', null );
				assert.deepStrictEqual( markTexts(), [ 'soft\u00adhyphen' ] );
			} );
		} );

		it( 'highlights the match with <mark> when the Highlight API is unavailable', () => {
			setUp();
			const result = jump( 'founded in 1850', 'History' );
			assert.deepStrictEqual( result, { type: 'highlight', rect: rect( 500, 20 ) } );
			assert.deepStrictEqual( markTexts(), [ 'founded', ' in ', '1850' ] );
		} );

		it( 'uses the CSS Custom Highlight API when available', () => {
			setUp( { highlightAPI: true } );
			const result = jump( 'founded in 1850', 'History' );
			assert.strictEqual( result.type, 'highlight' );
			const highlight = window.CSS.highlights.get( 'pcs-highlight' );
			assert.strictEqual( highlight.range, window.ranges[ 0 ] );
			assert.strictEqual( highlight.range.startContainer.nodeValue, 'founded' );
			assert.strictEqual( highlight.range.endContainer.nodeValue, '1850' );
			assert.strictEqual( document.querySelectorAll( 'mark' ).length, 0 );
		} );

		it( 'only searches within the given section', () => {
			setUp();
			jump( 'city was founded', 'Natural_history' );
			assert.strictEqual( document.querySelector( 'mark.pcs-highlight' ).parentElement.id, 'nature-p' );
		} );

		it( 'searches the whole page when there is no section', () => {
			setUp();
			const result = jump( 'on a river', null );
			assert.strictEqual( result.type, 'highlight' );
			assert.strictEqual( document.querySelector( 'mark.pcs-highlight' ).parentElement.id, 'nature-p' );
		} );

		it( 'falls back to the section heading when the text is not found', () => {
			setUp();
			const result = jump( 'on a river', 'History' );
			assert.deepStrictEqual( result, { type: 'section', rect: rect( 300, 30 ) } );
			assert.strictEqual( document.querySelectorAll( 'mark' ).length, 0 );
		} );

		it( 'falls back to the section heading when there is no text', () => {
			setUp();
			assert.deepStrictEqual( jump( null, 'History' ), { type: 'section', rect: rect( 300, 30 ) } );
			assert.deepStrictEqual( jump( '', 'History' ), { type: 'section', rect: rect( 300, 30 ) } );
		} );

		it( 'returns null when neither is found', () => {
			setUp();
			assert.strictEqual( jump( 'nope', 'Nope' ), null );
			assert.strictEqual( jump( null, null ), null );
		} );

		it( 'expands the collapsed section containing the match', () => {
			setUp();
			const section = document.querySelector( 'section[data-mw-section-id="1"]' );
			const headerWrapper = section.querySelector( '.pcs-edit-section-header' );
			SectionUtilities.prepareForHiding( document, '1', section, headerWrapper, headerWrapper, 'Expand', 'Collapse' );
			const control = document.getElementById( SectionUtilities.getControlIdForSectionId( '1' ) );
			assert.ok( control.classList.contains( 'pcs-section-control-show' ) );
			jump( 'founded in 1850', 'History' );
			assert.ok( control.classList.contains( 'pcs-section-control-hide' ) );
		} );

		it( 'expands the collapsed table containing the match', () => {
			setUp();
			collapseTables();
			const content = document.querySelector( '.pcs-collapse-table-content' );
			assert.strictEqual( content.style.display, 'none' );
			const result = jump( '12,000 in 1900', 'Natural_history' );
			assert.strictEqual( result.type, 'highlight' );
			assert.strictEqual( content.style.display, 'block' );
			assert.strictEqual( document.querySelector( 'mark.pcs-highlight' ).parentElement.id, 'population' );
		} );

		it( 'does not match the collapsed table caption', () => {
			setUp();
			collapseTables();
			assert.ok( document.querySelector( '.pcs-collapse-table-collapsed-container' ).textContent.includes( 'Quick facts' ) );
			assert.strictEqual( jump( 'Quick facts', 'Natural_history' ).type, 'section' );
		} );

		it( 'scrolls the target to the center of the viewport and adjusts the rect', () => {
			setUp();
			const result = jump( 'founded', 'History', { scroll: true } );
			// 1000 + 500 + 20 / 2 - 800 / 2
			assert.strictEqual( window.pageYOffset, 1110 );
			assert.deepStrictEqual( result.rect, rect( 390, 20 ) );
		} );

		it( 'does not scroll by default', () => {
			setUp();
			jump( 'founded', 'History' );
			assert.strictEqual( window.pageYOffset, 1000 );
		} );

		it( 'replaces the previous highlight', () => {
			setUp();
			jump( 'founded in 1850', 'History' );
			jump( 'on a river', 'Natural_history' );
			assert.deepStrictEqual( markTexts(), [ 'on a river' ] );
		} );
	} );

	describe( '.clearHighlight()', () => {
		it( 'removes <mark> highlights and restores the text nodes', () => {
			setUp();
			const paragraph = document.getElementById( 'history-p' );
			const before = paragraph.innerHTML;
			jump( 'city was founded in 1850 by', 'History' );
			assert.notStrictEqual( paragraph.innerHTML, before );
			Highlight.clearHighlight();
			assert.strictEqual( paragraph.innerHTML, before );
		} );

		it( 'removes the CSS Custom Highlight', () => {
			setUp( { highlightAPI: true } );
			jump( 'founded', 'History' );
			assert.strictEqual( window.CSS.highlights.size, 1 );
			Highlight.clearHighlight();
			assert.strictEqual( window.CSS.highlights.size, 0 );
		} );
	} );
} );
