'use strict';

/**
 * @module lib/transformations/rmRefLinkbacks
 */

/**
 * Removes reference link backs.
 * Example: <a href=\"#cite_ref-1\"><span class=\"mw-linkback-text\">↑ </span></a>
 *
 * @param {!Document} doc
 */
module.exports = (doc) => {
	const ps = doc.querySelectorAll('span.mw-linkback-text') || [];
	for (let idx = 0; idx < ps.length; idx++) {
		const node = ps[idx];
		const parent = node.parentNode;
		if (parent.tagName === 'A') {
			parent.parentNode.removeChild(parent);
		}
	}
};
