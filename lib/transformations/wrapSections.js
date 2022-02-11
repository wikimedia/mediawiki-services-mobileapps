'use strict';
const domino = require('domino');

/**
 * Parses response of action=html and adds section tags.
 *
 * @param {Element} heading
 * @return {number}
 */
const getTocLevel = ( heading ) => {
	switch ( heading.tagName ) {
		case 'h4':
			return 4;
		case 'h3':
			return 3;
		case 'h2':
			return 2;
		case 'h1':
			return 1;
		default:
			return 5;
	}
};

/**
 * Parses response of action=html and adds section tags.
 *
 * @param {Object} doc
 * @param {number} id
 * @param {string} html
 * @return {array}
 */
const makeSection = ( heading, id, text ) => {
	return {
		id,
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
	const toc = po.querySelector( '#toc' );
	if ( toc ) {
		toc.parentNode.removeChild( toc );
	}
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
		}
		text += child.outerHTML;
	}
	sections.push( makeSection( lastHeading, id, text ) );

	return sections;
};

module.exports = {
	makeSections
};
