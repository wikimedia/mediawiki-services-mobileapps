'use strict';

module.exports = (doc, selector, attributeArray) => {
	const ps = doc.querySelectorAll(selector) || [];
	for (let idx = 0; idx < ps.length; idx++) {
		const node = ps[idx];
		for (let aa = 0; aa < attributeArray.length; aa++) {
			node.removeAttribute(attributeArray[aa]);
		}
	}
};
