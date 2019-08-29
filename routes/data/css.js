'use strict';

const sUtil = require('../../lib/util');
const lib = require('../../lib/css');
const fetchBaseCss = lib.fetchBaseCss;
const fetchMobileSiteCss = lib.fetchMobileSiteCss;
const fetchPageLibCss = lib.fetchPageLibCss;
const fetchPageLibPostCss = lib.fetchPageLibPostCss;

const router = sUtil.router();

let app;

/**
 * Gets the base CSS for the mobile apps
 */
router.get('/base', (req, res) => fetchBaseCss(res));

/**
 * Gets the pagelib CSS for the mobile apps
 */
router.get('/pagelib', (req, res) => fetchPageLibCss(res));

/**
 * Gets the pagelibpost CSS for the mobile apps
 */
router.get('/pagelibpost', (req, res) => fetchPageLibPostCss(res));

/**
 * Gets the site-specific mobile styles defined in MediaWiki:Mobile.css
 */
router.get('/site', (req, res) => fetchMobileSiteCss(req, res));

module.exports = function(appObj) {
    app = appObj;
    return {
        path: '/data/css/mobile',
        api_version: 1,
        router
    };
};
