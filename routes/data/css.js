'use strict';

const sUtil = require('../../lib/util');
const lib = require('../../lib/css');
const pageLib = require('../../lib/pagelibServer');
const fetchBaseCss = lib.fetchBaseCss;
const fetchMobileSiteCss = lib.fetchMobileSiteCss;

const router = sUtil.router();

let app;

/**
 * Gets the base CSS for the mobile apps
 */
router.get('/base', (req, res) => fetchBaseCss(res));

/**
 * Gets the pagelib CSS for the mobile apps
 */
router.get('/pagelib', (req, res) => {
    return pageLib.loadCss()
    .then(css => lib.respond(res, css));
});

/**
 * Gets the site-specific mobile styles defined in MediaWiki:Mobile.css
 */
router.get('/site', (req, res) => fetchMobileSiteCss(app, req, res));

module.exports = function(appObj) {
    app = appObj;
    return {
        path: '/data/css/mobile',
        api_version: 1,
        router
    };
};
