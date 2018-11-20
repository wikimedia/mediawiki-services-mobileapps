'use strict';

/*
 * Extracts the first infobox from an article
 * @param {!Document} doc representing article
 * @return {String[]} representing infobox html
 */
function extractInfobox( doc ) {
	let infobox;
	const node = doc.querySelector( '.infobox' );
	if ( node ) {
		infobox = node.parentNode.removeChild( node ).outerHTML;
	}
	return infobox;
}

module.exports = extractInfobox;
