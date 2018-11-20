'use strict';

const mwapi = require( '../../mwapi' );
const isTooSmall = require( '../../media' ).isTooSmall;
const isDisallowed = require( '../../media' ).isDisallowed;

const thumbBucketWidthCandidates = [
	mwapi.LEAD_IMAGE_M,
	mwapi.LEAD_IMAGE_S
];

const adjustSrcSet = ( srcSet, origWidth, candidateBucketWidth ) => {
	const srcSetEntries = srcSet.split( ',' ).map( ( str ) => str.trim() );
	const updatedEntries = [];
	srcSetEntries.forEach( ( entry ) => {
		const entryParts = entry.split( ' ' );
		const src = entryParts[ 0 ];
		const res = entryParts[ 1 ];
		const multiplier = res.substring( 0, res.toLowerCase().indexOf( 'x' ) );
		const desiredWidth = candidateBucketWidth * multiplier;
		if ( desiredWidth < origWidth ) {
			const scaledThumbUrl = mwapi.scaledThumbUrl( src, desiredWidth, origWidth );
			if ( scaledThumbUrl ) {
				updatedEntries.push( `${scaledThumbUrl} ${res}` );
			}
		}
	} );
	if ( updatedEntries.length ) {
		return updatedEntries.join( ', ' );
	}
};

const adjustThumbWidths = ( doc ) => {
	const imgs = doc.querySelectorAll( 'img' );
	[].forEach.call( imgs, ( img ) => {
		if ( isTooSmall( img ) || isDisallowed( img ) ) {
			return;
		}
		const src = img.getAttribute( 'src' );
		const srcSet = img.getAttribute( 'srcset' );
		const width = img.getAttribute( 'width' );
		const height = img.getAttribute( 'height' );
		const origWidth = img.getAttribute( 'data-file-width' );
		for ( let i = 0; i < thumbBucketWidthCandidates.length; i++ ) {
			const candidateBucketWidth = thumbBucketWidthCandidates[ i ];
			if ( candidateBucketWidth >= origWidth ) {
				continue;
			}
			const scaledThumbUrl = mwapi.scaledThumbUrl( src, candidateBucketWidth, origWidth );
			if ( scaledThumbUrl ) {
				img.setAttribute( 'src', scaledThumbUrl );
				img.setAttribute( 'height', Math.round( height * candidateBucketWidth / width ) );
				img.setAttribute( 'width', candidateBucketWidth );
				if ( srcSet ) {
					const adjustedSrcSet = adjustSrcSet( srcSet, origWidth, candidateBucketWidth );
					if ( adjustedSrcSet ) {
						img.setAttribute( 'srcSet', adjustedSrcSet );
					} else {
						img.removeAttribute( 'srcSet' );
					}
				}
				break;
			}
		}
	} );
};

module.exports = adjustThumbWidths;
