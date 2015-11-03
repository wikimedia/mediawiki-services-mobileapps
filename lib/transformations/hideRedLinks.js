/**
 * DOM transformation shared with app. Let's keep this in sync with the app.
 * Last sync: Android repo 3d5b441 www/js/transforms/hideRedLinks.js
 *
 * The main change from the original Android app file is to use
 * content.createElement() instead of document.createElement().
 */

'use strict';

function hideRedLinks(content) {
	var redLinks = content.querySelectorAll( 'a.new' );
	for ( var i = 0; i < redLinks.length; i++ ) {
		var redLink = redLinks[i];
		var replacementSpan = content.createElement( 'span' );
		replacementSpan.innerHTML = redLink.innerHTML;
		replacementSpan.setAttribute( 'class', redLink.getAttribute( 'class' ) );
		redLink.parentNode.replaceChild( replacementSpan, redLink );
	}
}

module.exports = {
	hideRedLinks: hideRedLinks
};
