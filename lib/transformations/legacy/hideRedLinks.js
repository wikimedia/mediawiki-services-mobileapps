/**
 * DOM transformation shared with app. Let's keep this in sync with the app.
 * Last sync: Android repo 3d5b441 www/js/transforms/hideRedLinks.js
 *
 * The main change from the original Android app file is to use
 * content.createElement() instead of document.createElement().
 */

'use strict';

const flattenElements = require( '../flattenElements' );

function hideRedLinks( content ) {
	flattenElements( content, 'a.new' );
}

module.exports = hideRedLinks;
