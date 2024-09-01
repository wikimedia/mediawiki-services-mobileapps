'use strict';

/**
 * @module routes/page/description
 */

const BBPromise = require('bluebird');
const sUtil = require('../../lib/util');
const HTTPError = sUtil.HTTPError;
const mwapi = require('../../lib/mwapi');
const mUtil = require('../../lib/mobile-util');

/**
 * The main router object
 */
const router = sUtil.router();

const ENWIKI_REGEX = /^en\.wikipedia(?:\.beta\.wmflabs)?\.org$/;

/**
 * Check whether domain is english wikipedia.
 *
 * @param {string} domain
 * @return {boolean}
 */
function isEnWiki(domain) {
	return ENWIKI_REGEX.test(domain);
}

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * Get page description
 * Title redirection status: not handled
 * GET {domain}/v1/page/description/{title}
 */
router.get('/description/:title', (req, res) => mwapi.getMetadataForDescription(req)
	.then((description) => {
		res.status(200);
		mUtil.setContentType(res, mUtil.CONTENT_TYPES.description);
		res.set('Content-Language', description.lang);
		res.send({ description: description.value });
		res.end();
	}));

/**
 * Update page description
 * Title redirection status: not handled
 * PUT {domain}/v1/page/description/{title}
 */
router.put('/description/:title', (req, res) => {
	if (!req.body.description) {
		throw new HTTPError({
			status: 400,
			type: 'bad_request',
			title: 'Invalid request',
			detail: 'Parameter required: body.description'
		});
	}
	let setDescriptionPromise;
	if (isEnWiki(req.params.domain)) {
		setDescriptionPromise = mwapi.setLocalShortDescription(req, req.body.description);
	} else {
		setDescriptionPromise = mwapi.setCentralDescription(req, req.body.description);
	}
	return setDescriptionPromise
		.then((description) => {
			res.status(201);
			mUtil.setContentType(res, mUtil.CONTENT_TYPES.description);
			res.set('Content-Language', description.language);
			res.send({ description: description.value });
			res.end();
		});
});

/**
 * Delete page description
 * Title redirection status: not handled
 * DELETE {domain}/v1/page/description/{title}
 */
router.delete('/description/:title', (req, res) => {
	let deleteDescriptionPromise;
	if (isEnWiki(req.params.domain)) {
		deleteDescriptionPromise = mwapi.setLocalShortDescription(req, '');
	} else {
		deleteDescriptionPromise = mwapi.setCentralDescription(req, '');
	}
	return deleteDescriptionPromise
		.then(() => {
			res.status(204);
			res.end();
		});
});

module.exports = function(appObj) {
	app = appObj;
	return {
		path: '/page',
		api_version: 1,
		router
	};
};
