'use strict';

/**
 * @module lib/css
 */

const fs = require('fs');
const mUtil = require('./mobile-util');
const mwapi = require('./mwapi');
const api = require('./api-util');

const pageLibCss = `${ __dirname }/../pagelib/build/wikimedia-page-library-transform.css`;
const pageLibLegacyCss = `${ __dirname }/../pagelib/legacy/legacy-pagelib.css`;

const SITE_MODULES = [ 'site.styles' ];

function loadResourceLoaderModules(req, modules, lang = 'en') {
	const query = {
		modules: modules.join('|'),
		only: 'styles',
		target: 'mobile',
		skin: 'minerva',
		lang
	};
	return api.mwLoadResourceLoaderModules(req, query);
}

function respond(res, css) {
	res.status(200);
	mUtil.setContentType(res, mUtil.CONTENT_TYPES.css);
	mUtil.setETag(res, mUtil.hashCode(css));
	res.set('Cache-Control', res.req.app.conf.cache_headers['static-assets']);
	res.end(css);
}

function fetchBaseCss(res) {
	const fname = `${ __dirname }/../private/base.css`;
	fs.readFile(fname, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

function fetchMobileSiteCss(req, res) {
	return mwapi.getSiteInfo(req)
		.then(si => loadResourceLoaderModules(req, SITE_MODULES, si.general.lang)
			.then(css => respond(res, css.body)));
}

function fetchLegacyPageLibCss(res) {
	fs.readFile(pageLibLegacyCss, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

function fetchPageLibCss(res) {
	fs.readFile(pageLibCss, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

module.exports = {
	fetchBaseCss,
	fetchMobileSiteCss,
	fetchLegacyPageLibCss,
	fetchPageLibCss,
	respond,
};
