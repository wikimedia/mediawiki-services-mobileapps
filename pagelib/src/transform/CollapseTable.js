/**
 * @module pagelib/src/transform/CollapseTable
 */

import './CollapseTable.less';
import ElementUtilities from './ElementUtilities';
import NodeUtilities from './NodeUtilities';
import Polyfill from './Polyfill';
import { ARIA } from './HTMLUtilities';

/** @type {Object} */
const NODE_TYPE = NodeUtilities.NODE_TYPE;

/** @type {string} */
const SECTION_TOGGLED_EVENT_TYPE = 'section-toggled';

/** @type {string} */
const BREAKING_SPACE = ' ';

/** @type {Object} */
const CLASS = {
	ICON: 'pcs-collapse-table-icon',
	CONTAINER: 'pcs-collapse-table-container',
	CONTENT: 'pcs-collapse-table-content',
	COLLAPSED_CONTAINER: 'pcs-collapse-table-collapsed-container',
	COLLAPSED: 'pcs-collapse-table-collapsed',
	COLLAPSED_BOTTOM: 'pcs-collapse-table-collapsed-bottom',
	COLLAPSE_TEXT: 'pcs-collapse-table-collapse-text',
	EXPANDED: 'pcs-collapse-table-expanded',
	TABLE_INFOBOX: 'pcs-table-infobox',
	TABLE_OTHER: 'pcs-table-other',
	TABLE: 'pcs-collapse-table'
};

/** @type {Object} */
const ID = {
	ARIA_COLLAPSE: 'pcs-collapse-table-aria-collapse',
	ARIA_EXPAND: 'pcs-collapse-table-aria-expand'
};

/** @type {RegExp} */
const MATH_IMG_URL_PATH_REGEX = /\/math\/render\/svg\//;

/**
 * Determine if we want to extract text from this header.
 *
 * @param {!Element} header
 * @return {!boolean}
 */
const isHeaderEligible =
  ( header ) => Polyfill.querySelectorAll( header, 'a' ).length < 3;

/**
 * Determine eligibility of extracted text.
 *
 * @param {?string} headerText
 * @return {!boolean}
 */
const isHeaderTextEligible = ( headerText ) =>
	headerText && headerText.replace( /[\s0-9]/g, '' ).length > 0;

/**
 * Extracts first word from string. Returns null if for any reason it is unable to do so.
 *
 * @param  {!string} string
 * @return {?string}
 */
const firstWordFromString = ( string ) => {
	// 'If the global flag (g) is not set, Element zero of the array contains the entire match,
	// while elements 1 through n contain any submatches.'
	const matches = string.match( /\w+/ ); // Only need first match so not using 'g' option.
	if ( !matches ) {
		return undefined;
	}
	return matches[ 0 ];
};

/**
 * Is node's textContent too similar to pageTitle. Checks if the first word of the node's
 * textContent is found at the beginning of pageTitle.
 *
 * @param  {!Node} node
 * @param  {!string} pageTitle
 * @return {!boolean}
 */
const isNodeTextContentSimilarToPageTitle = ( node, pageTitle ) => {
	const firstPageTitleWord = firstWordFromString( pageTitle );
	const firstNodeTextContentWord = firstWordFromString( node.textContent );
	// Don't claim similarity if 1st words were not extracted.
	if ( !firstPageTitleWord || !firstNodeTextContentWord ) {
		return false;
	}
	return firstPageTitleWord.toLowerCase() === firstNodeTextContentWord.toLowerCase();
};

/**
 * Removes leading and trailing whitespace and normalizes other whitespace - i.e. ensures
 * non-breaking spaces, tabs, etc are replaced with regular breaking spaces.
 *
 * @param  {!string} string
 * @return {!string}
 */
const stringWithNormalizedWhitespace = ( string ) => string.trim().replace( /\s/g, BREAKING_SPACE );

/**
 * Determines if node is a BR.
 *
 * @param  {!Node}  node
 * @return {!boolean}
 */
const isNodeBreakElement = ( node ) => node.nodeType === NODE_TYPE.ELEMENT_NODE && node.tagName === 'BR';

/**
 * Replace node with a text node bearing a single breaking space.
 *
 * @param {!Document} document
 * @param  {!Node} node
 * @return {void}
 */
const replaceNodeWithBreakingSpaceTextNode = ( document, node ) => {
	/* DOM sink status: safe - content transform with no user interference */
	node.parentNode.replaceChild( document.createTextNode( BREAKING_SPACE ), node );
};

/**
 * Extracts any header text determined to be eligible.
 *
 * @param {!Document} document
 * @param {!Element} header
 * @param {?string} pageTitle
 * @return {?string}
 */
const extractEligibleHeaderText = ( document, header, pageTitle ) => {
	if ( !isHeaderEligible( header ) ) {
		return null;
	}
	// Clone header into fragment. This is done so we can remove some elements we don't want
	// represented when "textContent" is used. Because we've cloned the header into a fragment, we are
	// free to strip out anything we want without worrying about affecting the visible document.
	const fragment = document.createDocumentFragment();
	fragment.appendChild( header.cloneNode( true ) );
	const fragmentHeader = fragment.querySelector( 'th' );

	Polyfill.querySelectorAll(
		fragmentHeader, '.geo, .coordinates, sup.mw-ref, ol, ul, style, script'
	).forEach( ( el ) => el.remove() );

	let cur = fragmentHeader.lastChild;
	while ( cur ) {
		if ( pageTitle &&
      NodeUtilities.isNodeTypeElementOrText( cur ) &&
      isNodeTextContentSimilarToPageTitle( cur, pageTitle ) ) {
			if ( cur.previousSibling ) {
				cur = cur.previousSibling;
				cur.nextSibling.remove();
			} else {
				cur.remove();
				cur = undefined;
			}
		} else if ( isNodeBreakElement( cur ) ) {
			replaceNodeWithBreakingSpaceTextNode( document, cur );
			cur = cur.previousSibling;
		} else {
			cur = cur.previousSibling;
		}
	}

	const headerText = fragmentHeader.textContent;
	if ( isHeaderTextEligible( headerText ) ) {
		return stringWithNormalizedWhitespace( headerText );
	}
	return null;
};

/**
 * Find an array of table header (TH) contents. If there are no TH elements in
 * the table or the header's link matches pageTitle, an empty array is returned.
 *
 * @param {!Document} document
 * @param {!Element} element
 * @param {?string} pageTitle Unencoded page title; if this title matches the
 *                            contents of the header exactly, it will be omitted.
 * @return {!Array<string>}
 */
const getTableHeaderTextArray = ( document, element, pageTitle ) => {
	const headerTextArray = [];

	const walker = document.createTreeWalker( element );
	let header = walker.nextNode();
	while ( header ) {
		if ( header.tagName !== 'TH' ) {
			header = walker.nextNode();
			continue;
		}
		const headerText = extractEligibleHeaderText( document, header, pageTitle );
		if ( headerText && !headerTextArray.includes( headerText ) ) {
			headerTextArray.push( headerText );
			// 'newCaptionFragment' only ever uses the first 2 items.
			if ( headerTextArray.length === 2 ) {
				break;
			}
		}
		header = walker.nextNode();
	}
	return headerTextArray;
};

/**
 * @typedef {Function} FooterDivClickCallback
 * @param {!HTMLElement}
 * @return {void}
 */

/**
 * @param {!Element} container div
 * @param {?Element} trigger element that was clicked or tapped
 * @param {?FooterDivClickCallback} footerDivClickCallback
 * @param {?Element} expend/collapse tables
 * @param {boolean} forceExpand
 * @return {boolean} true if collapsed, false if expanded.
 */
const toggleCollapsedForContainer = function ( container, trigger, footerDivClickCallback, forceExpand ) {
	const header = container.children[ 0 ];
	const table = container.children[ 1 ];
	const footer = container.children[ 2 ];
	const caption = header.querySelector( '.pcs-collapse-table-aria' );
	const collapsed = forceExpand === undefined ? table.style.display !== 'none' : !forceExpand;
	if ( collapsed ) {
		table.style.display = 'none';
		header.classList.remove( CLASS.COLLAPSED );
		header.classList.remove( CLASS.ICON );
		header.classList.add( CLASS.EXPANDED );
		if ( caption ) {
			caption.setAttribute( ARIA.LABELED_BY, ID.ARIA_EXPAND );
		}
		footer.style.display = 'none';
		// if they clicked the bottom div, then scroll back up to the top of the table.
		if ( trigger === footer && footerDivClickCallback ) {
			footerDivClickCallback( container );
		}
	} else {
		table.style.display = 'block';
		header.classList.remove( CLASS.EXPANDED );
		header.classList.add( CLASS.COLLAPSED );
		header.classList.add( CLASS.ICON );
		if ( caption ) {
			caption.setAttribute( ARIA.LABELED_BY, ID.ARIA_COLLAPSE );
		}
		footer.style.display = 'block';
	}
	return collapsed;
};

/**
 * Ex: toggleCollapseClickCallback.bind(el, (container) => {
 * window.scrollTo(0, container.offsetTop - transformer.getDecorOffset())
 * })
 *
 * @this HTMLElement
 * @param {?FooterDivClickCallback} footerDivClickCallback
 * @return {boolean} true if collapsed, false if expanded.
 */
const toggleCollapseClickCallback = function ( footerDivClickCallback ) {
	const container = this.parentNode;
	return toggleCollapsedForContainer( container, this, footerDivClickCallback );
};

/**
 * @param {!HTMLElement} table
 * @return {!boolean} true if table should be collapsed, false otherwise.
 */
const shouldTableBeCollapsed = ( table ) => {
	const disallowedClasses = [ 'navbox', 'vertical-navbox', 'navbox-inner', 'metadata', 'mbox-small' ];
	const doesContainDisallowedClass = disallowedClasses.some( ( clazz ) => table.classList.contains( clazz ) );
	let isHidden;
	// Wrap in a try-catch block to avoid Domino crashing on a malformed style declaration.
	// T229521
	try {
		isHidden = table.style.display === 'none';
	} catch ( e ) {
		// If Domino fails to parse styles, err on the safe side and don't transform
		isHidden = true;
	}
	return !isHidden && !doesContainDisallowedClass;
};

/**
 * @param {!Element} element
 * @return {!boolean} true if element is an infobox, false otherwise.
 */
const isInfobox = ( element ) =>
	element.classList.contains( 'infobox' ) ||
  element.classList.contains( 'infobox_v3' );

/**
 * @param {!Document} document
 * @param {!DocumentFragment} content
 * @return {!HTMLDivElement}
 */
const newCollapsedHeaderDiv = ( document, content ) => {
	const div = document.createElement( 'div' );
	div.classList.add( CLASS.COLLAPSED_CONTAINER );
	div.classList.add( CLASS.EXPANDED );
	// https://phabricator.wikimedia.org/T409964
	// Explicitly invert images in collapsed header to ensure visibility on dark mode, since
	// the images are highly likely to be math formulas with black text on transparent background.
	div.classList.add( 'skin-invert-image' );
	/* DOM sink status: risk? - content come from newCaptionFragment which is potentially risky */
	div.appendChild( content );
	return div;
};

/**
 * @param {!Document} document
 * @param {?string} content HTML string.
 * @return {!HTMLDivElement}
 */
const newCollapsedFooterDiv = ( document, content ) => {
	const div = document.createElement( 'div' );
	div.classList.add( CLASS.COLLAPSED_BOTTOM );
	div.classList.add( CLASS.ICON );
	/* DOM sink status: sanitized - footer title can be overridden by the client */
	div.textContent = content || '';
	return div;
};

/**
 * @param {!Array.<string>} headerText
 * @param document
 * @param headerTextElem
 * @return {!HTMLElement}
 */
const transformHeaderText = ( document, headerTextElem ) => {
	if ( headerTextElem.match( MATH_IMG_URL_PATH_REGEX ) ) {
		const mathImgElem = document.createElement( 'img' );
		mathImgElem.setAttribute( 'src', headerTextElem );
		return mathImgElem;
	} else {
		return document.createTextNode( headerTextElem );
	}
};

/**
 * @param {!Document} document
 * @param {!string} title
 * @param {!string} titleClass
 * @param {!Array.<string>} headerText
 * @param {string} collapseText Text for VoiceOver to read
 * @param {string} expandText Text for VoiceOver to read
 * @return {!DocumentFragment}
 */
const newCaptionFragment = ( document, title, titleClass, headerText, collapseText, expandText ) => {
	const fragment = document.createDocumentFragment();

	const strong = document.createElement( 'strong' );
	/* DOM sink status: sanitized - title can be overridden by clients */
	strong.textContent = title;
	strong.classList.add( titleClass );
	fragment.appendChild( strong );

	const span = document.createElement( 'span' );
	span.classList.add( CLASS.COLLAPSE_TEXT );

	if ( headerText.length > 0 ) {
		/* DOM sink status: safe - content from parsoid output */
		span.appendChild( document.createTextNode( ' ' ) );
		span.appendChild( transformHeaderText( document, headerText[ 0 ] ) );
	}
	if ( headerText.length > 1 ) {
		/* DOM sink status: safe - content from parsoid output */

		// Don't place a comma between text and formula right after it
		if ( !headerText[ 0 ].match( MATH_IMG_URL_PATH_REGEX ) && headerText[ 1 ].match( MATH_IMG_URL_PATH_REGEX ) ) {
			span.appendChild( document.createTextNode( ' ' ) );
		} else {
			span.appendChild( document.createTextNode( ', ' ) );
		}
		span.appendChild( transformHeaderText( document, headerText[ 1 ] ) );
	}
	if ( headerText.length > 0 ) {
		/* DOM sink status: safe - content transform with no user interference */
		// As single character `…`, iOS's VoiceOver ignores this. As `...`, it reads it as "ellipsis". :facepalm:
		span.appendChild( document.createTextNode( ' ...' ) );
	}

	/* DOM sink status: safe - content from parsoid output */
	fragment.appendChild( span );

	// While this should be on the actual caret, we'd need to make the caret it's own element
	// (rather than a backround image on the entire section) to read the action as well as the text.
	// For now, we're creating a new invisible element that is read by the screen reader.
	const ariaDescription = document.createElement( 'span' );
	ariaDescription.classList.add( 'pcs-collapse-table-aria' );
	ariaDescription.setAttribute( ARIA.LABELED_BY, ID.ARIA_EXPAND );
	ariaDescription.setAttribute( 'role', 'button' );
	ariaDescription.setAttribute( 'display', 'none' );
	ariaDescription.appendChild( document.createTextNode( '' ) );

	// Check if it already exists from another table - only need once on entire document
	if ( document.getElementById( ID.ARIA_EXPAND ) === null ) {
		const ariaDescriptionExpand = document.createElement( 'span' );
		ariaDescriptionExpand.setAttribute( 'id', ID.ARIA_EXPAND );
		ariaDescriptionExpand.setAttribute( ARIA.LABEL, expandText );
		ariaDescription.appendChild( ariaDescriptionExpand );
	}

	if ( document.getElementById( ID.ARIA_COLLAPSE ) === null ) {
		const ariaDescriptionCollapse = document.createElement( 'span' );
		ariaDescriptionCollapse.setAttribute( 'id', ID.ARIA_COLLAPSE );
		ariaDescriptionCollapse.setAttribute( ARIA.LABEL, collapseText );
		ariaDescription.appendChild( ariaDescriptionCollapse );
	}

	fragment.appendChild( ariaDescription );

	return fragment;
};

/**
 * @param {!Node} nodeToReplace
 * @param {!Node} replacementNode
 * @return {void}
 */
const replaceNodeInSection = ( nodeToReplace, replacementNode ) => {
	if ( !nodeToReplace || !replacementNode ) {
		return;
	}
	let parentNode = nodeToReplace.parentNode;
	if ( !parentNode ) {
		return;
	}
	parentNode.insertBefore( replacementNode, nodeToReplace );
	parentNode.removeChild( nodeToReplace );
};

/**
 * @param {!DOMElement} table
 * @param {!Document} document
 * @param {?string} pageTitle use title for this not `display title` (which can contain tags)
 * @param {?string} tableTitle title for the table
 * @param {?string} tableClass css class
 * @param {!Array<string>} headerTextArray array of header text strings
 * @param {?string} footerTitle
 * @param {string} collapseText Text for VoiceOver to read
 * @param {string} expandText Text for VoiceOver to read
 * @return {void}
 */
const prepareTable = ( table, document, pageTitle, tableTitle,
	tableClass, headerTextArray, footerTitle, collapseText, expandText ) => {

	if ( table.parentElement &&
    table.parentElement.tagName === 'BLOCKQUOTE' &&
    table.parentElement.classList.contains( 'quotebox-quote' ) ) {
		return;
	}

	// create the container div that will contain both the original table
	// and the collapsed version.
	const containerDiv = document.createElement( 'div' );
	containerDiv.className = CLASS.CONTAINER;
	replaceNodeInSection( table, containerDiv );

	// ensure the table doesn't float
	table.classList.add( CLASS.TABLE );

	// T252893 - Create filter to omit NavFrame class
	// Exlicitly set values of filter constants
	const FILTER_ACCEPT = 1;
	const FILTER_REJECT = 2;
	const SHOW_ELEMENT = '-1';
	const filterNavFrame = {
		acceptNode: function ( n ) {
			return n && n.className && n.className.includes( 'NavFrame' ) ? FILTER_REJECT : FILTER_ACCEPT;
		}
	};

	// Check if table has math elements and does not have text descrition for collapsing header
	// Omit tables with infobox class even if they have math elements. That kind of tables should display only text in the header
	if ( !table.className.includes( 'infobox' ) && table.className.includes( CLASS.TABLE ) ) {
		const tableWalker = document.createTreeWalker( table, SHOW_ELEMENT, filterNavFrame );
		const mathAndTextArr = [];

		while ( tableWalker.nextNode() ) {
			if ( tableWalker.currentNode && tableWalker.currentNode.className && tableWalker.currentNode.className.includes( 'mwe-math-fallback-image-inline' ) ) {
				// Grab the text before math symbol if exists
				if ( tableWalker.currentNode.parentNode && tableWalker.currentNode.parentNode.previousSibling ) {
					const mathText = tableWalker.currentNode.parentNode.previousSibling.textContent.trim();
					mathAndTextArr.push( mathText );
				}
				const mathImgSrc = tableWalker.currentNode.getAttribute( 'src' );
				mathAndTextArr.push( mathImgSrc );

				headerTextArray = mathAndTextArr;
			}
		}

	}

	const captionFragment = newCaptionFragment(
		document,
		tableTitle,
		tableClass,
		headerTextArray,
		collapseText,
		expandText );

	// pcs-collapse-table
	const collapsedHeaderDiv = newCollapsedHeaderDiv( document, captionFragment );
	collapsedHeaderDiv.style.display = 'block';

	const collapsedFooterDiv = newCollapsedFooterDiv( document, footerTitle );
	collapsedFooterDiv.style.display = 'none';

	// add our stuff to the container
	/* DOM sink status: risk? - collapsedHeaderDiv is potentially risk */
	containerDiv.appendChild( collapsedHeaderDiv );
	/* DOM sink status: safe - content from parsoid output */

	// Add a wrapper div for content to allow for overflow scrolling
	const contentDiv = document.createElement( 'div' );
	contentDiv.className = CLASS.CONTENT;
	contentDiv.appendChild( table );
	containerDiv.appendChild( contentDiv );

	/* DOM sink status: risk? - collapsedFooterDiv is potentially risk */
	containerDiv.appendChild( collapsedFooterDiv );

	// set initial visibility
	contentDiv.style.display = 'none';
};

/**
 * @param {!Document} document
 * @param {?string} pageTitle use title for this not `display title` (which can contain tags)
 * @param {?string} infoboxTitle
 * @param {?string} otherTitle
 * @param {?string} footerTitle
 * @return {void}
 */
const prepareTables = ( document, pageTitle, infoboxTitle, otherTitle, footerTitle ) => {
	const tables = document.querySelectorAll( 'table, .infobox_v3' );
	for ( let i = 0; i < tables.length; ++i ) {
		const table = tables[ i ];
		if ( ElementUtilities.findClosestAncestor( table, `.${ CLASS.CONTAINER }` ) ||
      !shouldTableBeCollapsed( table ) ) {
			continue;
		}
		const isBox = isInfobox( table );
		const headerTextArray = getTableHeaderTextArray( document, table, pageTitle );
		if ( !headerTextArray.length && !isBox ) {
			continue;
		}
		const title = isBox ? infoboxTitle : otherTitle;
		const cls = isBox ? CLASS.TABLE_INFOBOX : CLASS.TABLE_OTHER;
		prepareTable( table, document, pageTitle, title, cls, headerTextArray, footerTitle );
	}
};

/**
 * @param {!Element} container root element to search from
 * @return {void}
 */
const toggleCollapsedForAll = ( container ) => {
	const containerDivs = Polyfill.querySelectorAll( container, `.${ CLASS.CONTAINER }` );
	containerDivs.forEach( ( containerDiv ) => {
		toggleCollapsedForContainer( containerDiv );
	} );
};

/**
 * @param {!Element} container root element to search from
 * @param {!boolean} expand/collapse tables manually
 * @param expand
 * @return {void}
 */
const expandOrCollapseTables = ( container, expand ) => {
	const containerDivs = Polyfill.querySelectorAll( container, `.${ CLASS.CONTAINER }` );
	containerDivs.forEach( ( containerDiv ) => {
		toggleCollapsedForContainer( containerDiv, undefined, undefined, expand );
	} );
};

/**
 * @param {!Window} window
 * @param {!Element} container root element to search from
 * @param {?boolean} isInitiallyCollapsed
 * @param {?FooterDivClickCallback} footerDivClickCallback
 * @return {void}
 */
const setupEventHandling = ( window, container, isInitiallyCollapsed, footerDivClickCallback ) => {
	/**
	 * @param {boolean} collapsed
	 * @return {boolean}
	 */
	const dispatchSectionToggledEvent = ( collapsed ) =>
		window.dispatchEvent( new Polyfill.CustomEvent( SECTION_TOGGLED_EVENT_TYPE, { collapsed } ) );

	// assign click handler to the collapsed divs
	const collapsedHeaderDivs = Polyfill.querySelectorAll( container, `.${ CLASS.COLLAPSED_CONTAINER }` );
	collapsedHeaderDivs.forEach( ( collapsedHeaderDiv ) => {
		collapsedHeaderDiv.onclick = () => {
			const collapsed = toggleCollapseClickCallback.bind( collapsedHeaderDiv )();
			dispatchSectionToggledEvent( collapsed );
		};
	} );

	const collapsedFooterDivs = Polyfill.querySelectorAll( container, `.${ CLASS.COLLAPSED_BOTTOM }` );
	collapsedFooterDivs.forEach( ( collapsedFooterDiv ) => {
		collapsedFooterDiv.onclick = () => {
			const collapsed = toggleCollapseClickCallback.bind( collapsedFooterDiv,
				footerDivClickCallback )();
			dispatchSectionToggledEvent( collapsed );
		};
	} );

	if ( !isInitiallyCollapsed ) {
		toggleCollapsedForAll( container );
	}
};

/**
 * @param {!Window} window
 * @param {!Document} document
 * @param {?string} pageTitle use title for this not `display title` (which can contain tags)
 * @param {?boolean} isMainPage
 * @param {?boolean} isInitiallyCollapsed
 * @param {?string} infoboxTitle
 * @param {?string} otherTitle
 * @param {?string} footerTitle
 * @param {?FooterDivClickCallback} footerDivClickCallback
 * @return {void}
 */
const adjustTables = ( window, document, pageTitle, isMainPage, isInitiallyCollapsed,
	infoboxTitle, otherTitle, footerTitle, footerDivClickCallback ) => {
	if ( isMainPage ) {
		return;
	}

	prepareTables( document, pageTitle, infoboxTitle, otherTitle, footerTitle );
	setupEventHandling( window, document, isInitiallyCollapsed, footerDivClickCallback );
};

/**
 * @param {!Window} window
 * @param {!Document} document
 * @param {?string} pageTitle use title for this not `display title` (which can contain tags)
 * @param {?boolean} isMainPage
 * @param {?string} infoboxTitle
 * @param {?string} otherTitle
 * @param {?string} footerTitle
 * @param {?FooterDivClickCallback} footerDivClickCallback
 * @return {void}
 */
const collapseTables = ( window, document, pageTitle, isMainPage, infoboxTitle, otherTitle,
	footerTitle, footerDivClickCallback ) => {
	adjustTables( window, document, pageTitle, isMainPage, true, infoboxTitle, otherTitle,
		footerTitle, footerDivClickCallback );
};

/**
 * If you tap a reference targeting an anchor within a collapsed table, this
 * method will expand the references section. The client can then scroll to the
 * references section.
 *
 * The first reference (an "[A]") in the "enwiki > Airplane" article from ~June
 * 2016 exhibits this issue. (You can copy wikitext from this revision into a
 * test wiki page for testing.)
 *
 * @param  {?Element} element
 * @return {void}
 */
const expandCollapsedTableIfItContainsElement = ( element ) => {
	if ( element ) {
		const containerSelector = `[class*="${ CLASS.CONTAINER }"]`;
		const container = ElementUtilities.findClosestAncestor( element, containerSelector );
		if ( container ) {
			const collapsedDiv = container.firstElementChild;
			if ( collapsedDiv && collapsedDiv.classList.contains( CLASS.EXPANDED ) ) {
				collapsedDiv.click();
			}
		}
	}
};

export default {
	CLASS,
	SECTION_TOGGLED_EVENT_TYPE,
	toggleCollapsedForAll,
	toggleCollapseClickCallback,
	expandOrCollapseTables,
	collapseTables,
	getTableHeaderTextArray,
	adjustTables,
	prepareTables,
	prepareTable,
	setupEventHandling,
	expandCollapsedTableIfItContainsElement,
	test: {
		extractEligibleHeaderText,
		firstWordFromString,
		shouldTableBeCollapsed,
		isHeaderEligible,
		isHeaderTextEligible,
		isInfobox,
		newCollapsedHeaderDiv,
		newCollapsedFooterDiv,
		newCaptionFragment,
		isNodeTextContentSimilarToPageTitle,
		stringWithNormalizedWhitespace,
		replaceNodeWithBreakingSpaceTextNode,
		getTableHeaderTextArray
	}
};
