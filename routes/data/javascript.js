'use strict';

/**
 * @module routes/data/javascript
 */
const sUtil = require('../../lib/util');
const js = require('../../lib/javascript');
const router = sUtil.router();

/**
 * Gets the JavaScript from the wikimedia-page-library
 */
router.get('/pagelib', (req, res) => js.fetchLegacyPageLibJs(res));
router.get('/pcs', (req, res) => js.fetchPageLibJs(res));
router.get('/mathjax', (req, res) => js.fetchMathJaxJs(res));
router.get( '/mathjax/fonts/mathjax-newcm-font/svg/dynamic/:font', ( req, res ) => js.fetchFontFile( req, res ) );
router.get('/mathjax/sre/mathmaps/:map', ( req, res ) => js.fetchMathjaxMathmap( req, res ) );
router.get('/mathjax/sre/speech-worker.js', (req, res) => js.fetchMathjaxSpeechWorker(req, res));

module.exports = function(appObj) {
	return {
		path: '/data/javascript/mobile',
		api_version: 1,
		router
	};
};
