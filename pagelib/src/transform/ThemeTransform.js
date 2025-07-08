/**
 * @module pagelib/src/transform/ThemeTransform
 */

import './ThemeTransform.less';

/**
 * @type {string}
 */
const CLASS_PREFIX = 'pcs-theme-';

/**
 * Theme to CSS classes.
 *
 * @type {!Object}
 */
const THEME = {
	DEFAULT: `${ CLASS_PREFIX }default`,
	DARK: `${ CLASS_PREFIX }dark`,
	SEPIA: `${ CLASS_PREFIX }sepia`,
	BLACK: `${ CLASS_PREFIX }black`
};

/**
 * @param {?Element} el element
 * @param {!string} theme
 * @return {void}
 */
const setThemeOnElement = ( el, theme ) => {
	if ( !el ) {
		return;
	}
	// Set the new theme.
	el.classList.add( theme );

	// Clear any previous theme.
	for ( const key in THEME ) {
		if ( Object.prototype.hasOwnProperty.call( THEME, key ) && THEME[ key ] !== theme ) {
			el.classList.remove( THEME[ key ] );
		}
	}
};

/**
 * @param {!Document} document
 * @param {!string} theme
 * @return {void}
 */
const setTheme = ( document, theme ) => {
	const body = document.body;
	setThemeOnElement( body, theme );

	// These classes are now applied on the server side by MobileHTML, but let's
	// also apply them here (when setting the Theme on the client side), to make
	// it compatible with existing unpurged articles.
	// (See comments in MobileHTML.js for explanations of these classes.)
	// (This can be removed after a sufficient time, when enough articles have been purged.)
	body.classList.add( 'mw-hide-empty-elt' );
	body.classList.add( 'skin--responsive' );

	// Set the theme on the html element, too.
	setThemeOnElement( document.documentElement, theme );

	if ( theme === THEME.DARK || theme === THEME.BLACK ) {
		document.documentElement.classList.add( 'skin-theme-clientpref-night' );
	} else {
		document.documentElement.classList.remove( 'skin-theme-clientpref-night' );
	}

	// the pcs element is necessary to allow
	// template editors to theme templates by
	// declaring styles for .themeclass .templateclass {
	// TemplateStyles are scoped to .mw-parser-outpt by parsoid
	// so without an intermediate div with the theme class,
	// the styles aren't applied
	const pcs = document.getElementById( 'pcs' );
	setThemeOnElement( pcs, theme );
};

/**
 * Set a custom font-family onto the document body. For example, setting a font-family
 * of "serif" will use the default serif font on the current platform.
 *
 * @param {!Document} document
 * @param {!string} font
 * @return {void}
 */
const setBodyFont = ( document, font ) => {
	document.body.style.fontFamily = font;
};

export default {
	THEME,
	CLASS_PREFIX,
	setTheme,
	setBodyFont
};
