/**
 * @module pagelib/src/pcs/c1/Page
 */

import AdjustTextSize from '../../transform/AdjustTextSize';
import BodySpacingTransform from '../../transform/BodySpacingTransform';
import CollapseTable from '../../transform/CollapseTable';
import DemoMode from './DemoMode';
import DimImagesTransform from '../../transform/DimImagesTransform';
import EditTransform from '../../transform/EditTransform';
import InteractionHandling from './InteractionHandling';
import LazyLoadTransform from '../../transform/LazyLoadTransform';
import NodeUtilities from '../../transform/NodeUtilities';
import PlatformTransform from '../../transform/PlatformTransform';
import SectionUtilities from '../../transform/SectionUtilities';
import ThemeTransform from '../../transform/ThemeTransform';
import HTMLUtilities from '../../transform/HTMLUtilities';

const unitsRegex = /[^0-9]+$/;

const PCS_CSS_CLASS_ELEMENT_HIGHLIGHT = 'pcs-element-highlight';

/**
 * Waits for the next paint, then calls the callback
 *
 * @param {?OnSuccess} onSuccess callback
 * @return {void}
 */
const waitForNextPaint = ( onSuccess ) => {
	if ( !( onSuccess instanceof Function ) ) {
		return;
	}
	if ( window && window.requestAnimationFrame ) {
		// request animation frame and set timeout before callback to ensure paint occurs
		window.requestAnimationFrame( () => {
			setTimeout( () => {
				onSuccess();
			}, 1 );
		} );
	} else {
		onSuccess();
	}
};

/**
 * Makes multiple page modifications based on client specific settings, which should be called
 * during initial page load.
 *
 * @param {?{}} optionalSettings client settings
 *   { platform, version, theme, dimImages, margins, areTablesInitiallyExpanded,
 *   scrollTop, textSizeAdjustmentPercentage }
 * @param {?OnSuccess} onSuccess callback
 * @return {void}
 */
const setup = ( optionalSettings, onSuccess ) => {
	const settings = optionalSettings || {};

	PlatformTransform.setVersion( document, settings.version );

	if ( settings.platform !== undefined ) {
		PlatformTransform.setPlatform( document, PlatformTransform.CLASS_PREFIX + settings.platform );
	}
	if ( settings.theme !== undefined ) {
		ThemeTransform.setTheme( document, ThemeTransform.CLASS_PREFIX + settings.theme );
	}
	if ( settings.bodyFont !== undefined ) {
		ThemeTransform.setBodyFont( document, settings.bodyFont );
	}
	if ( settings.dimImages !== undefined ) {
		DimImagesTransform.dimImages( document, settings.dimImages );
	}
	let metaTags; // lazy load these to avoid a double query selector
	if ( settings.margins !== undefined || settings.leadImageHeight !== undefined ) {
		const margins = settings.margins || {};
		if ( settings.leadImageHeight !== undefined ) {
			if ( !metaTags ) {
				metaTags = getMetaTags();
			}
			const leadImage = getLeadImageFromMetaTags( metaTags );
			if ( leadImage.source ) {
				if ( margins.top ) {
					const top = parseFloat( margins.top, 10 );
					const height = parseFloat( settings.leadImageHeight, 10 );
					const units = margins.top.match( unitsRegex ) || '';
					margins.top = top + height + units;
				} else {
					margins.top = settings.leadImageHeight;
				}
			}
		}
		BodySpacingTransform.setMargins( document.body, margins );
	}
	if ( settings.maxWidth !== undefined ) {
		setMaxWidth( settings.maxWidth );
	}
	if ( settings.userGroups !== undefined ) {
		if ( !metaTags ) {
			metaTags = getMetaTags();
		}
		const protection = getProtectionFromMetaTags( metaTags );
		const isEditable = settings.isEditable !== undefined ? settings.isEditable : true;
		let isProtected = false;
		if ( protection.edit ) {
			isProtected = true;
			for ( let i = 0; i < settings.userGroups.length; i++ ) {
				const userGroup = settings.userGroups[ i ];
				if ( userGroup === protection.edit ) {
					isProtected = false;
					break;
				}
			}
		}
		setEditButtons( isEditable, isProtected );
	}
	if ( settings.setupTableEventHandling === undefined || settings.setupTableEventHandling ) {
		const isInitiallyCollapsed = settings.areTablesInitiallyExpanded !== true;
		CollapseTable.setupEventHandling( window,
			document,
			isInitiallyCollapsed, ( container ) => {
				window.scrollTo( 0, container.offsetTop - window.innerHeight / 2 );
			} );
	}

	if ( settings.textSizeAdjustmentPercentage !== undefined ) {
		AdjustTextSize.setPercentage(
			document.body,
			settings.textSizeAdjustmentPercentage
		);
	}
	if ( settings.loadImages === undefined || settings.loadImages === true ) {
		LazyLoadTransform.convertPlaceholdersToImages( document );
	}
	if ( settings.talkPageButton ) {
		setTalkPageButton( settings.talkPageButton );
	}
	if ( settings.footer ) {
		DemoMode.addFooter( new URL( document.location ) );
	}

	waitForNextPaint( onSuccess );
};

/**
 * Sets the theme.
 *
 * @param {!string} theme one of the values in Themes
 * @return {void}
 */
const setTheme = ( theme ) => {
	ThemeTransform.setTheme( document, theme );
};

/**
 * Toggles dimming of images.
 *
 * @param {!boolean} dimImages true if images should be dimmed, false otherwise
 * @return {void}
 */
const setDimImages = ( dimImages ) => {
	DimImagesTransform.dimImages( document, dimImages );
};

/**
 * Sets the margins.
 *
 * @param {!{BodySpacingTransform.Spacing}} margins
 * @return {void}
 */
const setMargins = ( margins ) => {
	BodySpacingTransform.setMargins( document.body, margins );
};

/**
 * Sets the max width of the content.
 *
 * @param {!string} maxWidth
 * @return {void}
 */
const setMaxWidth = ( maxWidth ) => {
	if ( !document || !document.body ) {
		return;
	}
	document.body.style.maxWidth = HTMLUtilities.escape( maxWidth );
};

/**
 * Sets text size adjustment percentage of the body element
 *
 * @param  {!string} textSize percentage for text-size-adjust in format of string, like '100%'
 * @return {void}
 */
const setTextSizeAdjustmentPercentage = ( textSize ) => {
	AdjustTextSize.setPercentage( document.body, textSize );
};

/**
 * Enables edit buttons to be shown (and which ones).
 *
 * @param {?boolean} isEditable true if edit buttons should be shown
 * @param {?boolean} isProtected true if the protected edit buttons should be shown
 * @return {void}
 */
const setEditButtons = ( isEditable, isProtected ) => {
	EditTransform.setEditButtons( document, isEditable, isProtected );
};

/**
 * Enables header title icon buttons to be shown.
 *
 * @param {?boolean} isVisible true if the title icon should be shown
 * @return {void}
 */
const setTalkPageButton = ( isVisible ) => {
	EditTransform.setTalkPageButton( document, isVisible );
};

/**
 * Gets the revision of the current mobile-html page.
 *
 * @return {?string}
 */
const getRevision = () => {
	const about = document.documentElement.getAttribute( 'about' );
	if ( !about ) {
		return undefined;
	}
	return about.slice( Math.max( 0, about.lastIndexOf( '/' ) + 1 ) );
};

/**
 * Get structured table of contents data
 *
 * @return {!Array}
 */
const getTableOfContents = () => {
	const sections = document.querySelectorAll( 'section' );
	const result = [];
	const levelCounts = new Array( 10 ).fill( 0 );
	let lastLevel = 0;

	[].forEach.call( sections, ( section ) => {
		const id = parseInt( section.getAttribute( 'data-mw-section-id' ), 10 );
		if ( !id || isNaN( id ) || id < 1 ) {
			return;
		}
		const headerEl = section.querySelector( 'h1,h2,h3,h4,h5,h6' );
		if ( !headerEl ) {
			return;
		}
		const level = parseInt( headerEl.tagName.charAt( 1 ), 10 ) - 1;
		if ( level < lastLevel ) {
			levelCounts.fill( 0, level );
		}
		lastLevel = level;
		levelCounts[ level - 1 ]++;
		result.push( {
			level,
			id,
			number: levelCounts.slice( 0, level ).map( ( n ) => n.toString() ).join( '.' ),
			anchor: headerEl.getAttribute( 'id' ),
			/* DOM sink status: safe - content transform with no user interference */
			title: headerEl.innerHTML.trim()
		} );
	} );
	return result;
};

/**
 * Get protection information for the page from given meta tags
 *
 * @private
 * @param {!Array} metaTags
 * @return {!map}
 */
const getProtectionFromMetaTags = ( metaTags ) => {
	const protection = {};
	const protectionPrefix = 'mw:pageProtection:';
	const protectionPrefixLength = protectionPrefix.length;
	metaTags.forEach( ( metaTag ) => {
		const property = metaTag.getAttribute( 'property' );
		if ( property && property.startsWith( protectionPrefix ) ) {
			protection[ property.slice( Math.max( 0, protectionPrefixLength ) ) ] = metaTag.getAttribute( 'content' );
		}
	} );
	return protection;
};

/**
 * Return meta tags for the page
 *
 * @private
 * @return {!Array}
 */
const getMetaTags = () => document.head.querySelectorAll( 'meta' );

/**
 * Get protection information for the page
 *
 * @return {!map}
 */
const getProtection = () => getProtectionFromMetaTags( getMetaTags() );

/**
 * Ensures the element with the given anchor is visible before scrolling and returns the
 * boundingClientRect of that element
 *
 * @param {!string} anchor of the element that will be scrolled to
 * @param {!{}} options object with options. currently only supports
 * highlight = true to highlight the element
 * @return {void}
 */
const prepareForScrollToAnchor = ( anchor, options ) => {
	if ( !document ) {
		return undefined;
	}
	const element = document.getElementById( anchor );
	if ( !element ) {
		return undefined;
	}

	SectionUtilities.expandCollapsedSectionIfItContainsElement( document, element );
	CollapseTable.expandCollapsedTableIfItContainsElement( element );

	if ( options && options.highlight ) {
		removeHighlightsFromHighlightedElements();
		element.classList.add( PCS_CSS_CLASS_ELEMENT_HIGHLIGHT );
	}

	waitForNextPaint( () => {
		const rect = NodeUtilities.getBoundingClientRectAsPlainObject( element );
		InteractionHandling.scrollToAnchor( anchor, rect );
	} );
};

/**
 * Removes highlight class from any highlighted elements
 *
 * @return {void}
 */
const removeHighlightsFromHighlightedElements = () => {
	if ( !document ) {
		return;
	}
	const selector = `.${ PCS_CSS_CLASS_ELEMENT_HIGHLIGHT }`;
	let element = document.querySelector( selector );
	while ( element ) {
		element.classList.remove( PCS_CSS_CLASS_ELEMENT_HIGHLIGHT );
		element = document.querySelector( selector );
	}
};

/**
 * Expend or collapse all tables
 *
 * @param  {!boolean} Expand/collapse tables manually
 * @param {boolean} expand
 * @return {void}
 */
const expandOrCollapseTables = ( expand ) => {
	if ( !document ) {
		return;
	}
	CollapseTable.expandOrCollapseTables( document, expand );
};

/**
 * Gets the lead image for a page
 *
 * @private
 * @param {!Array} metaTags
 * @return {!map}
 */
const getLeadImageFromMetaTags = ( metaTags ) => {
	const image = {};
	const leadImageProperty = 'mw:leadImage';
	for ( let i = 0; i < metaTags.length; i++ ) {
		const metaTag = metaTags[ i ];
		const property = metaTag.getAttribute( 'property' );
		if ( !property || property !== leadImageProperty ) {
			continue;
		}
		image.source = metaTag.getAttribute( 'content' );
		const widthString = metaTag.getAttribute( 'data-file-width' );
		if ( widthString ) {
			image.width = parseInt( widthString, 10 );
		}
		const heightString = metaTag.getAttribute( 'data-file-height' );
		if ( heightString ) {
			image.height = parseInt( heightString, 10 );
		}
		break;
	}
	return image;
};

/**
 * Gets the lead image for a page
 *
 * @return {!map}
 */
const getLeadImage = () => getLeadImageFromMetaTags( getMetaTags() );

/**
 * Executes pagelib functionality intended to run before any content has loaded
 *
 * @return {void}
 */
const onBodyStart = () => {
	if ( !document ) {
		return;
	}

	// eslint-disable-next-line no-undef
	if ( typeof pcsClient !== 'undefined' && pcsClient.getSetupSettings ) {
		// eslint-disable-next-line no-undef
		const setupJSON = pcsClient.getSetupSettings();
		document.pcsSetupSettings = JSON.parse( setupJSON );
	}

	// eslint-disable-next-line no-undef
	if ( typeof pcsClient !== 'undefined' && pcsClient.onReceiveMessage ) {
		document.pcsActionHandler = ( action ) => {
			// eslint-disable-next-line no-undef
			pcsClient.onReceiveMessage( JSON.stringify( action ) );
		};
	}

	if ( document.pcsActionHandler ) {
		InteractionHandling.setInteractionHandler( document.pcsActionHandler );
	} else {

		InteractionHandling.setInteractionHandler( ( action ) => console.log( action ) );
	}

	const initialSetupCompletion = () => {
		InteractionHandling.initialSetupComplete();
	};
	if ( document.pcsSetupSettings ) {
		const preSettings = {
			margins: document.pcsSetupSettings.margins,
			maxWidth: document.pcsSetupSettings.maxWidth,
			textSizeAdjustmentPercentage: document.pcsSetupSettings.textSizeAdjustmentPercentage,
			leadImageHeight: document.pcsSetupSettings.leadImageHeight,
			userGroups: document.pcsSetupSettings.userGroups,
			theme: document.pcsSetupSettings.theme,
			platform: document.pcsSetupSettings.platform,
			bodyFont: document.pcsSetupSettings.bodyFont,
			isEditable: document.pcsSetupSettings.isEditable,
			loadImages: false,
			setupTableEventHandling: false
		};
		setup( preSettings, initialSetupCompletion );
		return;
	}

	const defaultInitialSettings = {
		loadImages: false,
		setupTableEventHandling: false,
		maxWidth: '100ex',
		margins: { top: '2em', bottom: '0' },
		userGroups: []
	};

	const queryString = document.location && document.location.search;
	if ( queryString ) {
		const queryParams = new URLSearchParams( document.location.search );
		if ( queryParams.get( 'theme' ) ) {
			defaultInitialSettings.theme = queryParams.get( 'theme' );
		}
	}

	setup( defaultInitialSettings, initialSetupCompletion );
};

/**
 * Executes pagelib functionality intended to run after all content has loaded
 *
 * @return {void}
 */
const onBodyEnd = () => {
	if ( !document ) {
		return;
	}
	let remainingContentTimeout = 100;

	EditTransform.setARIAEditButtons( document );

	/**
	 * Check query parameters to see if the footer should be automatically added.
	 *
	 * @return {boolean}
	 */
	const shouldAddFooter = () => {
		if ( document.location && document.location.search ) {
			const queryParams = new URLSearchParams( document.location.search );
			return queryParams.get( 'footer' ) === 'true' || queryParams.get( 'demo' ) !== null;
		}
		return false;
	};

	/**
	 * Executed when final setup is complete
	 *
	 * @return {void}
	 */
	const finalSetupComplete = () => {
		InteractionHandling.finalSetupComplete();
	};
	if ( document.pcsSetupSettings ) {
		const postSettings = document.pcsSetupSettings;
		delete postSettings.theme;
		delete postSettings.margins;
		delete postSettings.maxWidth;
		delete postSettings.userGroups;
		delete postSettings.leadImageHeight;
		delete postSettings.platform;
		delete postSettings.textSizeAdjustmentPercentage;
		postSettings.setupTableEventHandling = true;
		setup( postSettings, finalSetupComplete );
		remainingContentTimeout = document.pcsSetupSettings.remainingTimeout || remainingContentTimeout;
	} else {
		const footer = shouldAddFooter();
		setup( {
			setupTableEventHandling: true,
			areTablesInitiallyExpanded: true,
			talkPageButton: false,
			footer
		}, finalSetupComplete );
	}

	setTimeout( () => {
		const sections = document.querySelectorAll( 'section' );
		for ( let i = 1; i < sections.length; i++ ) {
			sections[ i ].style.display = '';
		}
		/*
      T325623 - Dispatch event that will trigger lazy-load image rendering on first load
      when no scroll or resize events happened
    */
		window.dispatchEvent( new CustomEvent( 'onBodyEnd' ) );

	}, remainingContentTimeout );
};

export default {
	onBodyStart,
	onBodyEnd,
	setup,
	setTheme,
	setDimImages,
	setMargins,
	setMaxWidth,
	setTextSizeAdjustmentPercentage,
	setEditButtons,
	setTalkPageButton,
	getLeadImage,
	getProtection,
	getRevision,
	getTableOfContents,
	prepareForScrollToAnchor,
	removeHighlightsFromHighlightedElements,
	expandOrCollapseTables,
	waitForNextPaint
};
