/**
 * DOM transformation shared with app. Let's keep this in sync with the app.
 * Last sync: Android repo 3d5b441 www/js/transforms/anchorPopUpMediaTransforms.js
 *
 * This is much simpler with Parsoid since we don't need to introduce new elements.
 * We just change the href and add the app_media class.
 * Because of that I also renamed the function to better describe what it does.
 * Still it's the Parsoid equivalent of a mobileview anchorPopUpMediaTransforms().
 */

'use strict';

function fixVideoAnchor(content) {
	var videoThumbImgElements = content.querySelectorAll( 'a[href] > img[data-file-type="video"]' );
	for ( var i = 0; i < videoThumbImgElements.length; i++ ) {
		var containerLink = videoThumbImgElements[i].parentNode;
		var referenceValue = containerLink.getAttribute('href');
		referenceValue = referenceValue.replace(/^\.\//, ''); // so it doesn't get the "/wiki" prefix
        containerLink.setAttribute( 'href', referenceValue );
        containerLink.classList.add( 'app_media' );
	}
}

module.exports = {
	fixVideoAnchor: fixVideoAnchor
};
