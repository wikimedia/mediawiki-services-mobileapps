'use strict';

/**
 * @module routes/data/css
 */

const sUtil = require('../../lib/util');
const lib = require('../../lib/css');
const fetchBaseCss = lib.fetchBaseCss;
const fetchMobileSiteCss = lib.fetchMobileSiteCss;
const fetchPageLibCss = lib.fetchPageLibCss;
const fetchLegacyPageLibCss = lib.fetchLegacyPageLibCss;
const { projectAllowMiddlewares } = require('../../lib/wmf-projects');

const router = sUtil.router();

let app;

/**
 * Gets the base CSS for the mobile apps
 */
router.get('/base', projectAllowMiddlewares['static-assets'], (req, res) => fetchBaseCss(res));

/**
 * Gets the pagelib CSS for the mobile apps
 */
router.get('/pagelib', projectAllowMiddlewares['static-assets'], (req, res) => fetchLegacyPageLibCss(res));

/**
 * Gets the pcs CSS for mobile-html
 */
router.get('/pcs', projectAllowMiddlewares['static-assets'], (req, res) => fetchPageLibCss(res));

/**
 * Gets the site-specific mobile styles defined in MediaWiki:Mobile.css
 */
router.get('/site', projectAllowMiddlewares['static-assets'], (req, res) => fetchMobileSiteCss(req, res));

module.exports = function(appObj) {
	app = appObj;
	return {
		path: '/data/css/mobile',
		api_version: 1,
		router
	};
};
