'use strict';

/*
    See https://phabricator.wikimedia.org/T170690
    Turns reference list content into a JSON structure.
*/

const _ = require( 'underscore' );
const NodeType = require( '../nodeType' );
const CITATION_TYPES = [ 'web', 'news', 'journal', 'book' ];
const DEFAULT_CITATION_TYPE = 'generic';

const hasOnlyWhitespace = ( node ) =>
	node.nodeType === NodeType.TEXT_NODE && /^\s*$/.test( node.textContent );

const getCiteNoteId = ( listItemElement ) => {
	const id = listItemElement.getAttribute( 'id' );
	return id && id.replace( /^cite_note-/, '' );
};

/**
 * @return {!Object} of {href, text}.
 */
const buildBackLinkObject = ( element ) => {
	return {
		href: element.getAttribute( 'href' ),
		text: _.escape( element.textContent.trim() )
	};
};

/**
 * Parses multiple back links wrapped in a span element.
 * @param {!Element} element 'span.mw-reference-text'
 * @return {!Object} of {href, text}.
 */
const structureMultipleBackLinks = ( element ) => {
	const resultArray = [];

	// TODO: check with domino guys if we should use a different API here.
	// https://github.com/fgnass/domino/blob/master/CHANGELOG.md
	const spanChildElements = element.children;
	for ( let i = 0; i < spanChildElements.length; i++ ) {
		const spanChildEl = spanChildElements[ i ];
		if ( spanChildEl.tagName === 'A' ) {
			resultArray.push( buildBackLinkObject( spanChildEl ) );
		}
	}
	return resultArray;
};

const structureBackLinks = ( listItemElement, logger ) => {
	let backLinks = [];
	const singleBackLinksElement = listItemElement.querySelector( 'a[rel=mw:referencedBy]' );
	if ( singleBackLinksElement ) {
		backLinks = [ buildBackLinkObject( singleBackLinksElement ) ];
	} else {
		const multipleBackLinksRoot = listItemElement.querySelector( 'span[rel=mw:referencedBy]' ) ||
            listItemElement.querySelector( 'span.mw-cite-backlink' );
		if ( multipleBackLinksRoot ) {
			backLinks = structureMultipleBackLinks( multipleBackLinksRoot );
		} else {
			logger.log( 'warn/ref', `no back links found for ${getCiteNoteId( listItemElement )}` );
		}
	}
	return backLinks;
};

const collectCitationsOfOneCiteElement = ( citations, citeElement ) => {
	const classes = citeElement.classList;
	for ( let k = 0; k < classes.length; k++ ) {
		if ( classes[ k ] !== 'citation' ) {
			citations.add( classes[ k ] );
		}
	}
};

const addCitationsToContent = ( citations, searchElement ) => {
	if ( searchElement.tagName === 'CITE' ) {
		collectCitationsOfOneCiteElement( citations, searchElement );
	} else {
		const citeElements = searchElement.querySelectorAll( 'cite' );
		for ( let i = 0; i < citeElements.length; i++ ) {
			collectCitationsOfOneCiteElement( citations, citeElements[ i ] );
		}
	}
};

const addHtmlToContent = ( content, html ) => {
	content.html = content.html ? content.html + html : html;
};

const getCitationType = ( citations ) => {
	if ( citations.size === 1 ) {
		const value = citations.values().next().value;
		if ( CITATION_TYPES.includes( value ) ) {
			return value;
		}
	}
	return DEFAULT_CITATION_TYPE;
};

/**
 * Returns reference content in an html string and citations set.
 * @param {!Element} spanElement 'span.mw-reference-text'
 * @return {!Object} of {html, citations}.
 */
const getReferenceContent = ( spanElement ) => {
	const childNodes = spanElement.childNodes;
	const content = { html: '', citations: new Set() };
	for ( let i = 0; i < childNodes.length; i++ ) {
		const node = childNodes[ i ];
		if ( hasOnlyWhitespace( node ) ) {
			continue;
		}

		addHtmlToContent( content, node.outerHTML || _.escape( node.textContent ) );
		if ( node.nodeType === NodeType.ELEMENT_NODE ) {
			addCitationsToContent( content.citations, node );
		}
	}

	content.type = getCitationType( content.citations );
	delete content.citations;
	return content;
};

/**
 * Builds the object structure of a single reference.
 * @param {!Element} listItemElement content for a single reference
 * @param {!Logger} logger a logger instance associated with the request
 * @return {id, back_links, content}
 */
const buildOneReferenceItem = ( listItemElement, logger ) => {
	const backLinks = structureBackLinks( listItemElement, logger );

	let content;
	const contentElement =
        listItemElement.querySelector( 'span.mw-reference-text,span.reference-text' );
	if ( contentElement ) {
		content = getReferenceContent( contentElement );
	} else {
		content = { html: '', type: DEFAULT_CITATION_TYPE };
	}

	return {
		id: getCiteNoteId( listItemElement ),
		back_links: backLinks,
		content
	};
};

/**
 * Builds an object structure for a single reference list.
 * @param {!Element} refListElement a DOM element with content for one reference list
 * @param {!Logger} logger a logger instance associated with the request
 * @return {Object} an object with order (an array of reference ids) and references
 */
const buildReferenceList = ( refListElement, logger ) => {
	const orderArray = [];
	const referencesById = {};
	const children = refListElement.children;
	for ( let i = 0; i < children.length; i++ ) {
		const node = children[ i ];
		if ( node.tagName === 'LI' ) {
			const referenceItem = buildOneReferenceItem( node, logger );
			orderArray.push( referenceItem.id );
			referencesById[ referenceItem.id ] = referenceItem;
			delete referenceItem.id;
		} else if ( hasOnlyWhitespace( node ) ) {
			// ignore white space
			logger.log( 'warn/ref', `ignore white space: ${node.outerHTML}` );
		} else {
			logger.log( 'warn/ref', `unexpected child tag: ${node.tagName}` );
		}
	}
	return { order: orderArray, references_by_id: referencesById };
};

module.exports = {
	buildReferenceList,
	unit: {
		structureBackLinks,
		getReferenceContent,
		buildOneReferenceItem
	}
};
