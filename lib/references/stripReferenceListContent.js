'use strict';

/**
 * Copies one attribute to a destination element if it exists in the source element.
 * @param {!Element} src the source element
 * @param {!Element} dest the destination element
 * @param {!string} attr the attribute name
 */
function copyAttribute( src, dest, attr ) {
	const value = src.getAttribute( attr );
	if ( value !== null ) {
		dest.setAttribute( attr, value );
	}
}

/**
 * Scan the DOM for reference lists and replace its contents with a placeholder div.
 * @param {!Document} doc to scan for references
 */
function stripReferenceListContent( doc ) {
	const refLists = doc.querySelectorAll( "*[typeof='mw:Extension/references']" );
	for ( const refList of refLists ) {
		const placeholder = doc.createElement( 'DIV' );
		placeholder.classList.add( 'mw-references-placeholder' );
		copyAttribute( refList, placeholder, 'about' );
		refList.parentNode.replaceChild( placeholder, refList );
	}
}

module.exports = stripReferenceListContent;
