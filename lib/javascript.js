'use strict';

/**
 * @module lib/javascript
 */

const fs = require('fs');
const mUtil = require('./mobile-util');
const path = require('path');
const { MATHJAX_FONT_NAMES, MATHJAX_MAP_NAMES } = require('./mathjax-files.js');

const pageLibJs = `${ __dirname }/../pagelib/build/wikimedia-page-library-pcs.js`;
const pageLibLegacyJs = `${ __dirname }/../pagelib/legacy/legacy-pagelib.js`;
const mathJaxJs = require.resolve('mathjax/mml-svg.js');
const speechWorkerJs = require.resolve('mathjax/sre/speech-worker.js' );

function respond(res, js) {
	res.status(200);
	mUtil.setContentType(res, mUtil.CONTENT_TYPES.javascript);
	mUtil.setETag(res, mUtil.hashCode(js));
	res.set('Cache-Control', res.req.app.conf.cache_headers['static-assets']);
	res.end(js);
}

function notfound(res) {
	res.status(404).status('File Not Found');
}

// Freeze pagelib for old versions of the Android app
function fetchLegacyPageLibJs(res) {
	fs.readFile(pageLibLegacyJs, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

function fetchPageLibJs(res) {
	fs.readFile(pageLibJs, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

// Serves MathJax so math markup in mobile-html can be typeset client-side.
function fetchMathJaxJs(res) {
	fs.readFile(mathJaxJs, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

const fontDir = path.join(path.dirname(require.resolve('@mathjax/mathjax-newcm-font/package.json' ) ), 'svg/dynamic/');

// Serve MathJax fonts
function fetchFontFile(req, res) {
	const font = req.params.font;
	if ( MATHJAX_FONT_NAMES.has(font) ) {
		const fontPath = path.join(fontDir, font);
		fs.readFile(fontPath, { encoding: 'utf-8' }, (err, data) => respond(res, data));
	} else {
		notfound(res);
	}
}

// Serve MathJax a11y helpers
function fetchMathjaxSpeechWorker(req, res) {
	fs.readFile(speechWorkerJs, { encoding: 'utf-8' }, (err, data) => respond(res, data));
}

function fetchMathjaxMathmap(req, res) {
	const map = req.params.map;
	const mathmapDirPath = path.dirname(speechWorkerJs);
	if ( MATHJAX_MAP_NAMES.has(map) ) {
		const mathmapPath = path.join(mathmapDirPath, 'mathmaps', map);
		fs.readFile(mathmapPath, { encoding: 'utf-8' }, (err, data) => respond(res, data));
	} else {
		notfound(res);
	}
}

module.exports = {
	fetchLegacyPageLibJs,
	fetchPageLibJs,
	fetchMathJaxJs,
	fetchFontFile,
	fetchMathjaxSpeechWorker,
	fetchMathjaxMathmap
};
