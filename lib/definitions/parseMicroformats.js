'use strict';

const microformat = require('microformat-node');

function flatten(object) {
	const obj = {};
	for (const key of Object.getOwnPropertyNames(object)) {
		if (object[key][0].html !== undefined) {
			obj[key] = object[key][0].html;
		}
	}
	return obj;
}

function parse(html, type) {
	return microformat.get({ html, textFormat: 'normalised', filters: [type] })
		.items.map(item => item.properties).map(flatten);
}

module.exports = parse;
