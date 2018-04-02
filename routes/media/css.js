'use strict';

const sUtil = require('../../lib/util');
const css = require('../../lib/css');
const fetchBaseCss = css.fetchBaseCss;
const fetchMobileSiteCss = css.fetchMobileSiteCss;
const fetchMobileAppBundle = css.fetchMobileAppBundle;

const router = sUtil.router();

/**
 * Gets the base CSS for the mobile apps
 */
router.get('/base', (req, res) => fetchBaseCss(res));

/**
 * Gets the site-specific mobile styles defined in MediaWiki:Mobile.css
 */
router.get('/site', (req, res) => fetchMobileSiteCss(req, res));

/**
 * Gets the mobile app bundle for the site (constant modules + the site's Mobile.css)
 * For the legacy bundling strategy, should be requested from en.wikipedia.org.
 */
router.get('/bundle', (req, res) => fetchMobileAppBundle(req, res));

module.exports = function() {
    return {
        path: '/media/css/mobile',
        api_version: 1,
        router
    };
};
