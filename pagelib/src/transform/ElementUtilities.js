/**
 * @module pagelib/src/transform/ElementUtilities
 */

import Polyfill from './Polyfill';

const DATA_PREFIX = 'data-'

// todo: drop ancestor consideration and move to Polyfill.closest().
/**
 * Returns closest ancestor of element which matches selector.
 * Similar to 'closest' methods as seen here:
 * https://api.jquery.com/closest/
 * https://developer.mozilla.org/en-US/docs/Web/API/Element/closest
 *
 * @param  {!Element} el        Element
 * @param  {!string} selector   Selector to look for in ancestors of 'el'
 * @return {?HTMLElement}       Closest ancestor of 'el' matching 'selector'
 */
const findClosestAncestor = ( el, selector ) => {
	let parentElement;
	for ( parentElement = el.parentElement;
		parentElement && !Polyfill.matchesSelector( parentElement, selector );
		parentElement = parentElement.parentElement ) {
		// Intentionally empty.
	}
	return parentElement;
};

/**
 * @param {?Element} element
 * @param {!string} property
 * @param {?string} value
 * @return {?Element} The inclusive first element with an inline style (and optional value) or
 * undefined.
 */
const closestInlineStyle = ( element, property, value ) => {
	for ( let el = element; el; el = el.parentElement ) {
		let thisValue;

		// Wrap in a try-catch block to avoid Domino crashing on a malformed style declaration.
		// T229521
		try {
			thisValue = el.style[ property ];
		} catch ( e ) {
			continue;
		}

		if ( thisValue ) {
			if ( value === undefined ) {
				return el;
			}
			if ( value === thisValue ) {
				return el;
			}
		}
	}
	return undefined;
};

/**
 * Determines if element has a table ancestor.
 *
 * @param  {!Element}  el   Element
 * @return {!boolean}       Whether table ancestor of 'el' is found
 */
const isNestedInTable = ( el ) => Boolean( findClosestAncestor( el, 'table' ) );

/**
 * @param {!HTMLElement} element
 * @return {!boolean} true if element affects layout, false otherwise.
 */
const isVisible = ( element ) =>
// https://github.com/jquery/jquery/blob/305f193/src/css/hiddenVisibleSelectors.js#L12
	Boolean( element.offsetWidth || element.offsetHeight || element.getClientRects().length );

/**
 * Copy existing attributes from source to destination as data-* attributes.
 *
 * @param {!HTMLElement} source
 * @param {!HTMLElement} destination
 * @return {void}
 */
const copyAttributesToDataAttributes = ( source, destination ) => {
	if (source && source.attributes && destination) {
		const attributes = source.attributes;
		for ( let i = 0; i < attributes.length; i++ ) {
			const attribute = attributes[ i ];
			destination.setAttribute( `${ DATA_PREFIX }${ attribute.name }`, attribute.value );
		}
	}
};

/**
 * Copy existing data-* attributes from source to destination as attributes.
 *
 * @param {!HTMLElement} source
 * @param {!HTMLElement} destination
 * @return {void}
 */
const copyDataAttributesToAttributes = ( source, destination ) => {
	if (source && source.attributes && destination) {
		const attributes = source.attributes;
		for ( let i = 0; i < attributes.length; i++ ) {
			const attribute = attributes[ i ];
			if ( attribute.name.startsWith( DATA_PREFIX ) ) {
				destination.setAttribute( attribute.name.substring( DATA_PREFIX.length ), attribute.value );
			}
		}
	}
};

export default {
	findClosestAncestor,
	isNestedInTable,
	closestInlineStyle,
	isVisible,
	copyAttributesToDataAttributes,
	copyDataAttributesToAttributes
};
