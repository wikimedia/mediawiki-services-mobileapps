'use strict';

module.exports = (doc, selector, ...attributes) => {
	const ps = doc.querySelectorAll(selector) || [];
	for (let idx = 0; idx < ps.length; idx++) {
		const node = ps[idx];
		attributes.forEach((attribute) => {
			let value = node.getAttribute(attribute);
			if (value) {
				value = value.replace(/^\.\//, '/wiki/');
				node.setAttribute(attribute, value);
			}
		});
	}
};
