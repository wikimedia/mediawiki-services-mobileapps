/**
 * @module pagelib/src/pcs/c1/Highlight
 *
 * The styles are in transform/Highlight.less. They are part of the transform bundle's CSS,
 * because that is the stylesheet mobile-html loads.
 */

import CollapseTable from '../../transform/CollapseTable';
import NodeUtilities from '../../transform/NodeUtilities';
import Polyfill from '../../transform/Polyfill';
import SectionUtilities from '../../transform/SectionUtilities';

/**
 * Name registered with the CSS Custom Highlight API, and class name of the <mark> fallback.
 *
 * @type {string}
 */
const HIGHLIGHT_NAME = 'pcs-highlight';

/**
 * Subtrees whose text is not part of the readable article content, so is never matched.
 *
 * @type {string}
 */
const EXCLUDED_SELECTOR = [
	'script',
	'style',
	'sup.reference',
	'.mw-ref',
	'.mwe-math-mathml-a11y',
	`.${ CollapseTable.CLASS.COLLAPSED_CONTAINER }`,
	`.${ CollapseTable.CLASS.COLLAPSED_BOTTOM }`
].join( ', ' );

/**
 * Characters dropped before matching: whitespace (\s, which includes the BOM), soft hyphen,
 * zero width characters and bidi controls.
 *
 * @type {RegExp}
 */
const IGNORED_CHARS = /[\s\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2064]/g;

/**
 * Typographic variants folded to one form before matching. The double prime (U+2033) is not
 * listed: NFKD already turns it into two primes.
 *
 * @type {!Map<string, string>}
 */
const EQUIVALENT_CHARS = new Map( [
	[ '\u03c2', '\u03c3' ], // final sigma -> sigma
	[ '\u2018', "'" ], // left single quote
	[ '\u2019', "'" ], // right single quote, apostrophe
	[ '\u201a', "'" ], // single low-9 quote
	[ '\u201b', "'" ], // single high-reversed-9 quote
	[ '\u02bc', "'" ], // modifier letter apostrophe
	[ '\u2032', "'" ], // prime
	[ '\u201c', '"' ], // left double quote
	[ '\u201d', '"' ], // right double quote
	[ '\u201e', '"' ], // double low-9 quote
	[ '\u201f', '"' ] // double high-reversed-9 quote
] );

/** @type {!Map<string, string>} */
const normalizedCharCache = new Map();

/**
 * Normalizes a single character for loose matching. Text on the page and the searched text are
 * normalized the same way, so they match even if they differ in case, invisible characters,
 * quote style or Unicode form.
 *
 * NFKD (compatibility decomposition) gives every character one canonical spelling, e.g.
 * precomposed e-acute (U+00E9) and 'e' + combining acute (U+0301) both become the latter,
 * the 'fi' ligature (U+FB01) becomes 'fi' and fullwidth 'A' (U+FF21) becomes 'A'.
 * That way text that went through a different Unicode normalization, e.g. in a search index,
 * still matches.
 *
 * @param {!string} ch a single code point
 * @return {!string} zero (ignored character) or more characters
 */
const normalizeChar = ( ch ) => {
	let normalized = normalizedCharCache.get( ch );
	if ( normalized === undefined ) {
		normalized = ch.toLowerCase()
			.normalize( 'NFKD' )
			.replace( IGNORED_CHARS, '' )
			.split( '' )
			.map( ( c ) => EQUIVALENT_CHARS.get( c ) || c )
			.join( '' );
		normalizedCharCache.set( ch, normalized );
	}
	return normalized;
};

/**
 * @param {?string} text
 * @return {!string}
 */
const normalizeText = ( text ) => Array.from( text || '', normalizeChar ).join( '' );

/**
 * Collects the matchable text nodes under root in document order.
 *
 * @param {!Node} root
 * @param {!Array<Text>} textNodes output
 * @return {!Array<Text>}
 */
const collectTextNodes = ( root, textNodes ) => {
	for ( let child = root.firstChild; child; child = child.nextSibling ) {
		if ( child.nodeType === NodeUtilities.NODE_TYPE.TEXT_NODE ) {
			textNodes.push( child );
		} else if ( child.nodeType === NodeUtilities.NODE_TYPE.ELEMENT_NODE &&
			!Polyfill.matchesSelector( child, EXCLUDED_SELECTOR ) ) {
			collectTextNodes( child, textNodes );
		}
	}
	return textNodes;
};

/**
 * A part of a match that lies within a single text node.
 *
 * @typedef {Object} TextSegment
 * @property {!Text} node
 * @property {!number} start offset in node
 * @property {!number} end offset in node
 */

/**
 * Finds the first occurrence of text under root, ignoring case, whitespace, invisible
 * characters, quote styles, references and inline markup boundaries.
 *
 * @param {!Element} root
 * @param {?string} text
 * @return {?Array<TextSegment>} the matched text, split per text node, or null if not found
 */
const findText = ( root, text ) => {
	const query = normalizeText( text );
	if ( !query ) {
		return null;
	}

	const textNodes = collectTextNodes( root, [] );
	let haystack = '';
	// For each character of haystack, where the original character is on the page.
	const sources = [];
	textNodes.forEach( ( node, nodeIndex ) => {
		let offset = 0;
		Array.from( node.nodeValue ).forEach( ( rawChar ) => {
			const normalized = normalizeChar( rawChar );
			const source = { nodeIndex, start: offset, end: offset + rawChar.length };
			for ( let i = 0; i < normalized.length; i++ ) {
				sources.push( source );
			}
			haystack += normalized;
			offset += rawChar.length;
		} );
	} );

	const index = haystack.indexOf( query );
	if ( index === -1 ) {
		return null;
	}
	const first = sources[ index ];
	const last = sources[ index + query.length - 1 ];
	const segments = textNodes.slice( first.nodeIndex, last.nodeIndex + 1 )
		.map( ( node ) => ( { node, start: 0, end: node.nodeValue.length } ) );
	segments[ 0 ].start = first.start;
	segments[ segments.length - 1 ].end = last.end;
	return segments;
};

/**
 * @return {!boolean} true if the CSS Custom Highlight API is available
 */
const supportsHighlightAPI = () =>
	!!( window.CSS && window.CSS.highlights && typeof window.Highlight === 'function' );

/**
 * Highlights the segments by wrapping each in a <mark>, for engines without the CSS Custom
 * Highlight API. Whitespace-only segments are skipped so no <mark> lands between table rows,
 * list items, etc.
 *
 * @param {!Array<TextSegment>} segments
 * @return {void}
 */
const wrapSegments = ( segments ) => {
	segments.forEach( ( { node, start, end } ) => {
		if ( !node.nodeValue.slice( start, end ).trim() ) {
			return;
		}
		const matched = start > 0 ? node.splitText( start ) : node;
		if ( end - start < matched.nodeValue.length ) {
			matched.splitText( end - start );
		}
		const mark = document.createElement( 'mark' );
		mark.className = HIGHLIGHT_NAME;
		matched.parentNode.replaceChild( mark, matched );
		mark.appendChild( matched );
	} );
};

/**
 * Removes the highlight added by jumpToHighlightOrSection(), if any.
 *
 * @return {void}
 */
const clearHighlight = () => {
	if ( supportsHighlightAPI() ) {
		window.CSS.highlights.delete( HIGHLIGHT_NAME );
	}
	const marks = document.querySelectorAll( `mark.${ HIGHLIGHT_NAME }` );
	Array.from( marks ).forEach( ( mark ) => {
		const parent = mark.parentNode;
		while ( mark.firstChild ) {
			parent.insertBefore( mark.firstChild, mark );
		}
		parent.removeChild( mark );
		parent.normalize();
	} );
};

/**
 * Highlights the segments and returns the bounding rect of the whole match.
 *
 * @param {!Array<TextSegment>} segments
 * @return {!Object<string, number>}
 */
const highlightSegments = ( segments ) => {
	const first = segments[ 0 ];
	const last = segments[ segments.length - 1 ];
	const range = document.createRange();
	range.setStart( first.node, first.start );
	range.setEnd( last.node, last.end );
	// Measure before wrapping, which would invalidate the range's boundary nodes.
	const rect = NodeUtilities.getBoundingClientRectAsPlainObject( range );
	if ( supportsHighlightAPI() ) {
		window.CSS.highlights.set( HIGHLIGHT_NAME, new window.Highlight( range ) );
	} else {
		wrapSegments( segments );
	}
	return rect;
};

/**
 * Scrolls so the rect is vertically centered in the viewport.
 *
 * @param {!Object<string, number>} rect viewport relative
 * @return {!Object<string, number>} rect, adjusted to be relative to the scrolled viewport
 */
const scrollToCenter = ( rect ) => {
	const scrollY = window.pageYOffset;
	const top = scrollY + rect.top + rect.height / 2 - window.innerHeight / 2;
	window.scrollTo( 0, Math.max( 0, top ) );
	const delta = window.pageYOffset - scrollY;
	return Object.assign( {}, rect, {
		top: rect.top - delta,
		bottom: rect.bottom - delta,
		y: rect.top - delta
	} );
};

/**
 * Result of jumpToHighlightOrSection().
 *
 * @typedef {Object} JumpResult
 * @property {!string} type 'highlight' if the text was found, 'section' if the section
 *   heading was used instead
 * @property {!Object<string, number>} rect bounding client rect of the target, relative to
 *   the viewport at the time the function returns
 */

/**
 * Highlights the first occurrence of highlightText in the section whose heading has the id
 * sectionId, and returns its position. If highlightText is empty or not found, returns the
 * position of the section heading instead. Any collapsed section or table containing the
 * target is expanded first.
 *
 * @param {?string} highlightText text to find and highlight
 * @param {?string} sectionId id of the section heading to search in and fall back to. This is
 *   the id, not the title: words are joined by underscores, e.g. 'Etymology_and_naming'. The
 *   whole page is searched if it is empty or not found.
 * @param {?{scroll: ?boolean}} options scroll: scroll the page so the target is centered
 * @return {?JumpResult} null if neither the text nor the section was found
 */
const jumpToHighlightOrSection = ( highlightText, sectionId, options ) => {
	clearHighlight();

	const heading = sectionId ? document.getElementById( sectionId ) : null;
	const root = heading && heading.closest( 'section' ) ||
		document.getElementById( 'pcs' ) || document.body;

	const segments = findText( root, highlightText );
	const target = segments ? segments[ 0 ].node.parentElement : heading;
	if ( !target ) {
		return null;
	}
	SectionUtilities.expandCollapsedSectionIfItContainsElement( document, target );
	CollapseTable.expandCollapsedTableIfItContainsElement( target );

	// Measure only after expanding: collapsed content has no layout.
	const rect = segments ?
		highlightSegments( segments ) :
		NodeUtilities.getBoundingClientRectAsPlainObject( target );
	return {
		type: segments ? 'highlight' : 'section',
		rect: options && options.scroll ? scrollToCenter( rect ) : rect
	};
};

export default {
	jumpToHighlightOrSection,
	clearHighlight
};
