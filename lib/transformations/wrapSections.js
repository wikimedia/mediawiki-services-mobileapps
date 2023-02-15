'use strict';

/**
 * @module lib/transformations/wrapSections
 */

const domino = require('domino');

/**
 * Parses response of action=html and adds section tags.
 *
 * @param {Element} heading
 * @return {number}
 */
const getTocLevel = ( heading ) => {
	switch ( heading.tagName ) {
		case 'H4':
			return 3;
		case 'H3':
			return 2;
		case 'H2':
		case 'H1':
			return 1;
		default:
			return 4;
	}
};

/**
 * Parses response of action=html and adds section tags.
 *
 * @param {Object|null} heading
 * @param {number} id
 * @param {string} html
 * @return {array}
 */
const makeSection = ( heading, id, text ) => {
	const headingLabel = heading ? heading.querySelector( 'span.mw-headline[id]' ) : null;
	return {
		id,
		anchor: headingLabel ? headingLabel.getAttribute( 'id' ) : '',
		toclevel: heading ? getTocLevel( heading ) : undefined,
		line: heading ? heading.textContent : undefined,
		text
	};
};

/**
 * Parses response of action=html and adds section tags.
 *
 * @param {string} html
 * @return {array}
 */
const makeSections = ( html ) => {
	const sections = [];
	const doc = domino.createDocument( html );
	const po = doc.querySelector( '.mw-parser-output' );
	const removeItems = po.querySelectorAll( '#toc,.mw-editsection' );
	removeItems.forEach( ( item ) => {
		item.parentNode.removeChild( item );
	} );
	const children = po.childNodes;

	let id = 0;
	let lastHeading;
	let text = '';
	for ( let i = 0; i < children.length; i++ ) {
		const child = children[i];
		const tag = child.tagName;
		if ( [ 'H1', 'H2', 'H3', 'H4', 'H5', 'H6' ].includes( tag ) ) {
			sections.push( makeSection( lastHeading, id, text ) );
			id += 1;
			text = '';
			lastHeading = child;
		} else {
			text += child.outerHTML;
		}
	}
	sections.push( makeSection( lastHeading, id, text ) );

	return sections;
};

module.exports = {
	makeSections
};
