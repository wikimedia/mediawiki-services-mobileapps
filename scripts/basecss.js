#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);

const modules = [
	'skins.minerva.styles',
	'mediawiki.page.gallery.styles',
	'ext.wikimediamessages.styles',
	'ext.cite.styles',
	'ext.cite.parsoid.styles',
	'ext.math.styles',
	'ext.pygments',
	'ext.timeline.styles',
];

const url = 'https://en.m.wikipedia.org/w/load.php?modules=' + modules.join('|') + '&only=styles&skin=minerva';

fetch(url)
	.then(res => res.text())
	.then(body => {
		const css = body;

		const problematicModules = css.match(/Problematic modules: (.+)/);
		if (problematicModules) {
			throw new Error('Problematic modules found: ' + problematicModules[1]);
		}

		return writeFile(path.join(__dirname, '../private/base.css'), css);
	});
