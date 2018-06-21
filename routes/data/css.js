'use strict';

const sUtil = require('../../lib/util');
const css = require('../../lib/css');
const fetchBaseCss = css.fetchBaseCss;
const fetchMobileSiteCss = css.fetchMobileSiteCss;

const router = sUtil.router();

let app;

/**
 * Gets the base CSS for the mobile apps
 */
router.get('/base', (req, res) => fetchBaseCss(res));

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
