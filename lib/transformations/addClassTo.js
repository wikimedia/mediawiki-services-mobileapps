'use strict';

module.exports = (doc, selector, ...classNames) => {
	const ps = doc.querySelectorAll(selector) || [];
	for (let idx = 0; idx < ps.length; idx++) {
		const node = ps[idx];
		classNames.forEach(c => node.classList.add(c));
	}
};
