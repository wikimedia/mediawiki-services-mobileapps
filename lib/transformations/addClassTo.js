'use strict';

/**
 * @module lib/transformations/addClassTo
 */

/**
 * Add class to do a given element
 *
 * @param {!Document} doc
 * @param {!string} selector
 * @param {Object} classNames
 * @return {void}
 */
module.exports = (doc, selector, ...classNames) => {
	const ps = doc.querySelectorAll(selector) || [];
	for (let idx = 0; idx < ps.length; idx++) {
		const node = ps[idx];
		classNames.forEach(c => node.classList.add(c));
	}
};
