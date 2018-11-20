'use strict';

const WidenImageTransform = require( 'wikimedia-page-library' ).WidenImage;

function isGalleryImage( image ) {
	return ( image.width >= 64 );
}

/**
 * Adds extra CSS classes to img elements to widen them if the image is found
 * to be fit for widening.
 * @param {!Document} document Parsoid page content DOM document
 */
const widenImages = ( document ) => {
	Array.from( document.querySelectorAll( 'figure img' ) ).forEach( ( image ) => {
		if ( isGalleryImage( image ) ) {
			WidenImageTransform.maybeWidenImage( image );
		}
	} );
};

module.exports = widenImages;
