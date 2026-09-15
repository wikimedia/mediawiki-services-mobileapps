'use strict';

/**
 * @module transformation/pageextracts/extractHatnotes
 */

const mUtil = require( '../../mobile-util' );

function getHatnoteForMobileSections( el ) {
	if ( mUtil.getSectionIdForElement( el ) === 0 && el.textContent.trim().length ) {
		return el.innerHTML.trim();
	}
}

function getHatnoteForMetadata( el ) {
	if ( el.textContent.trim().length ) {
		return {
			section: mUtil.getSectionIdForElement( el ),
			html: el.innerHTML.trim()
		};
	}
}

/**
 * Internal function for extracting hatnotes from a document.
 *
 * @param {!Document} doc
 * @param {!string} lang request wiki language
 * @param {!Function} extractionFn the extraction function used to produce a response item
 * @return {?String[]} where each element is the inner html of a lead section hatnote
 */
function extractHatnotes( doc, lang, extractionFn ) {
	let hatnotes;
	let selectors = [ '.hatnote', '.dablink' ];
	if ( lang === 'de' ) {
		selectors = selectors.concat( [
			'table#Vorlage_Begriffsklärungshinweis tbody > tr > td',
			'table#Vorlage_Dieser_Artikel tbody > tr > td'
		] );
	}
	const els = doc.querySelectorAll( selectors.join() );
	if ( els.length ) {
		hatnotes = Array.prototype.map.call( els, ( el ) => extractionFn( el ) ).filter( ( entry ) => !!entry );
	}
	if ( hatnotes && hatnotes.length ) {
		return hatnotes;
	}
}

/**
 * @param {!Document} doc
 * @param {!string} lang request wiki language
 * @return {?Object[]} where each element contains the hatnote's text, inner html, and section
 */
function extractHatnotesForMetadata( doc, lang ) {
	return extractHatnotes( doc, lang, getHatnoteForMetadata );
}

/**
 * @param {!Document} doc
 * @param {!string} lang request wiki language
 * @return {?String[]} where each element is the inner html of a lead section hatnote
 */
function extractHatnotesForMobileSections( doc, lang ) {
	return extractHatnotes( doc, lang, getHatnoteForMobileSections );
}

module.exports = {
	extractHatnotesForMetadata,
	extractHatnotesForMobileSections
};
